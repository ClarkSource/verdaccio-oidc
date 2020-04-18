import express, { Request } from 'express';
import { wrap } from 'async-middleware';
import { HttpError, Unauthorized, Forbidden } from 'http-errors';
import { VerdaccioOIDCPlugin } from '../plugin';
import { optionalTimeout } from '../utils/promises';
import {
  AuthenticationTimeoutError,
  AuthenticationFailedError
} from '../auth/store';
import {
  getProtocolAndHost,
  getBearerTokenFromRequest,
  buildURL
} from '../utils/http';

/**
 * Turns expected authentication flow errors into HTTP status code errors and
 * returns them. All unexpected errors are passed through as they are.
 */
function decorateAuthenticationError(error: Error) {
  let httpError: HttpError | undefined;

  if (error instanceof AuthenticationTimeoutError) {
    httpError = new Forbidden(`The SSO authentication flow timed out.`);
  } else if (error instanceof AuthenticationFailedError) {
    httpError = new Forbidden(
      `The SSO authentication flow failed or was canceled.`
    );
  }

  if (httpError) {
    httpError.source = error;
    return httpError;
  }

  return error;
}

export interface NPMMiddlewareConfig {
  /**
   * Optional timeout in milliseconds to keep `/-/whoami` requests pending to
   * support long-polling. If not specified, the timeout is infinite / there is
   * no timeout.
   */
  requestTimeout?: number;
}

export function mountNPM(
  plugin: VerdaccioOIDCPlugin,
  app: ReturnType<typeof express>
) {
  const {
    logger,
    authenticationStore,
    config: { middleware: config }
  } = plugin;

  const buildOIDCInitializationPath = (
    authenticationInitializationToken: string
  ) =>
    `/-/oidc/authorize?authenticationInitializationToken=${encodeURIComponent(
      authenticationInitializationToken
    )}`;

  /**
   * This is the first request that will be performed by the npm client, when
   * issuing a command like:
   *
   * ```bash
   * npm login --auth-type=sso --registry=http://localhost:5266 --scope=@oidc-test
   * ```
   *
   * The npm client expects the server to immediately respond with a JSON
   * response that contains these fields:
   *
   * - `token`: Will be stored by the client and then used as the `_authToken`
   *   for any further authenticated requests.
   * - `sso`: A URL that will be opened by the client in the user's browser.
   *
   * The idea is that the OIDC flow is then completed in the user's browser.
   * Meanwhile the client will poll `/-/whoami` with the `token` (`_authToken`)
   * as the Bearer Authentication token (`Authorization` HTTP header) and wait
   * for a successful response. While the user is performing the OIDC flow,
   * the server may respond with a `401` or just keep the request pending.
   */
  app.use(
    /^\/-\/user\/org\.couchdb\.user:npm_([a-z]+)_auth_dummy_user$/,
    wrap(async (req, res) => {
      const ssoType = req.params[0] as string;
      logger.debug(
        `Initializing npm authentication with SSO type '${ssoType}'.`
      );

      const {
        npmToken,
        authenticationInitializationToken
      } = await authenticationStore.createPendingAuthentication();

      res.send({
        token: npmToken,
        sso: buildURL(
          req,
          buildOIDCInitializationPath(authenticationInitializationToken)
        )
      });
    })
  );

  /**
   * This endpoint is called by the npm client with a `Authorization` HTTP
   * header including the `_authToken` as Bearer Authentication token.
   *
   * This endpoint is called for two scenarios.
   *
   * By "default" it is called by the npm client when the command `npm whoami`
   * is issued.
   *
   * During the `--auth-type=sso` authentication flow, this endpoint is polled
   * while the user is finishing the browser flow. We keep the client pending
   * for a configurable request timeout, so that npm client can long-poll over
   * repeated polling. If the request timeout is reached, we send a `401`
   * status code and the client will immediately retry.
   *
   * If the `_authToken` cannot be found in our database of pending
   * authentications, we just yield back to Verdaccio and let it handle it, to
   * be interoperable with other authentication plugins.
   */
  app.use(
    '/-/whoami',
    wrap(async (req, res, next) => {
      const npmToken = getBearerTokenFromRequest(req);

      // If there is no authentication pending for this token, yield back to
      // Verdaccio. This allows for interoperability with other authentication
      // plugins and Verdaccio itself.
      try {
        if (!(await authenticationStore.isPendingAuthentication(npmToken)))
          return next();
      } catch (error) {
        // Handle expected errors as HTTP errors and throw all unexpected errors
        // as a 500 server error.
        throw decorateAuthenticationError(error);
      }

      try {
        await optionalTimeout(
          authenticationStore.waitForAuthentication(npmToken),
          config.requestTimeout,
          () => {
            const shortToken = npmToken.slice(0, 8);
            logger.debug(
              `Request timed out, but browser flow is still pending. Token starts with '${shortToken}'.`
            );
            throw new Unauthorized(
              `The SSO browser flow is still pending. Please retry.`
            );
          }
        );
      } catch (error) {
        // Throw already decorated errors immediately.
        if (error instanceof HttpError) throw error;

        // Handle expected errors as HTTP errors and throw all unexpected errors
        // as a 500 server error.
        throw decorateAuthenticationError(error);
      }
    })
  );
}
