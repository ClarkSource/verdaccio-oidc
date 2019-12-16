import { Issuer, Client } from 'openid-client';
import { Logger } from '@verdaccio/types';
import { Request } from 'express';
import { buildURL } from './utils/http';

export interface OIDCControllerConfig {
  issuerURL: string;
  clientID: string;
  clientSecret: string;
}

export class OIDCController {
  private readonly config: OIDCControllerConfig;
  private readonly logger: Logger;

  private issuer!: Issuer;
  private client!: Client;

  public readonly ready: Promise<true>;

  constructor({
    config,
    logger
  }: {
    config: OIDCControllerConfig;
    logger: Logger;
  }) {
    this.config = config;
    this.logger = logger;

    this.ready = this.boot().then(() => true as true);
  }

  private async getIssuerFromURL(issuerURL: string) {
    this.logger.debug(`Trying to discover issuer from '${issuerURL}'.`);
    const issuer = await Issuer.discover(issuerURL);
    this.logger.debug(`Discovered issuer: ${issuer.metadata.issuer}`);
    this.logger.debug(issuer.metadata);
    return issuer;
  }

  private getClientFromIssuer({ Client }: Issuer) {
    const { clientID, clientSecret } = this.config;
    this.logger.debug(`Building OIDC client with client ID: ${clientID}`);
    return new Client({
      client_id: clientID,
      client_secret: clientSecret,
      response_types: ['code']
    });
  }

  async boot() {
    this.issuer = await this.getIssuerFromURL(this.config.issuerURL);
    this.client = this.getClientFromIssuer(this.issuer);
  }

  async handleCallback(req: Request) {
    const params = this.client.callbackParams(req);
    const redirectURI = buildURL(req, req.originalUrl);
    const tokenSet = await this.client.callback(redirectURI, params);
    return tokenSet;
  }

  getAuthorizationURL(callbackURL: string) {
    return this.client.authorizationUrl({
      redirect_uri: callbackURL,
      scope: 'openid profile groups email',
      response_mode: 'form_post'
    });
  }
}
