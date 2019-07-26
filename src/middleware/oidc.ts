import express, { Request } from 'express';
import { wrap } from 'async-middleware';
import bodyParser from 'body-parser';
import { VerdaccioOIDCPlugin } from '../plugin';
import { randomHex } from '../utils/random';

/**
 * Returns the full host with protocol from the `request`.
 * Respects the `x-forwarded-proto` HTTP header.
 *
 * @example 'https://registry.example.com'
 */
function getProtocolAndHost(request: Request) {
  const protocol = request.headers['x-forwarded-proto'] || request.protocol;
  const { host } = request.headers;
  return `${protocol}://${host}`;
}

export interface OIDCMiddlewareConfig {}

export function mountOIDC(
  plugin: VerdaccioOIDCPlugin,
  app: ReturnType<typeof express>
) {
  const {
    logger,
    authenticationStore,
    oidcController,
    config: { middleware: config }
  } = plugin;

  app.use(
    '/-/oidc/authorize',
    wrap(async (req, res) => {
      const authID: string =
        req.query.authenticationInitializationToken || (await randomHex());
      const authorizationFlow = oidcController.initializeAuthorization(authID);

      if (req.query.authenticationInitializationToken) {
      }

      res.redirect(authorizationFlow.authorizationURL);
    })
  );

  app.use(
    '/-/oidc/callback',
    bodyParser.urlencoded({ extended: false }),
    wrap(async (req, res) => {
      try {
        await oidcController.handleCallback(req);
      } catch {}
    })
  );
}
