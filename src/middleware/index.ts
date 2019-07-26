import express from 'express';
import { VerdaccioOIDCPlugin } from '../plugin';
import { mountNPM, NPMMiddlewareConfig } from './npm';
import { mountOIDC, OIDCMiddlewareConfig } from './oidc';

/**
 * The config of the `middlewares` section for `oidc` in the config `.yml`.
 */
export interface MiddlewareConfig
  extends NPMMiddlewareConfig,
    OIDCMiddlewareConfig {}

/**
 * Returns the `verdaccio-oidc` middleware, which can then be mounted by the
 * plugin.
 */
export function middleware(plugin: VerdaccioOIDCPlugin) {
  const app = express();

  mountNPM(plugin, app);
  mountOIDC(plugin, app);

  return app;
}
