import express, { Request } from 'express';
import { wrap } from 'async-middleware';
import bodyParser from 'body-parser';
import { BadRequest } from 'http-errors';
import { VerdaccioOIDCPlugin } from '../plugin';
import { randomHex } from '../utils/random';
import { buildURL } from '../utils/http';

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
      const { authenticationInitializationToken } = req.query;
      if (!authenticationInitializationToken) {
        throw new BadRequest(
          'Missing authenticationInitializationToken query parameter'
        );
      }

      res.cookie(
        'authenticationInitializationToken',
        authenticationInitializationToken,
        { httpOnly: true }
      );

      const callbackURL = buildURL(req, '/-/oidc/callback');
      const authorizationURL = oidcController.getAuthorizationURL(callbackURL);
      res.redirect(authorizationURL);
    })
  );

  app.use(
    '/-/oidc/callback',
    bodyParser.urlencoded({ extended: false }),
    wrap(async (req, res) => {
      const { authenticationInitializationToken } = req.cookies;
      if (!authenticationInitializationToken) {
        throw new BadRequest(
          'Missing authenticationInitializationToken cookie'
        );
      }

      const tokenSet = await oidcController.handleCallback(req);
      await authenticationStore.authenticate(
        tokenSet,
        authenticationInitializationToken
      );

      res.redirect('/');
    })
  );
}
