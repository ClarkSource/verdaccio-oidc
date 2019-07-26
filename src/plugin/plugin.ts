import {
  IPluginMiddleware,
  IPluginAuth,
  IBasicAuth,
  IStorageManager,
  PluginOptions,
  Config as VerdaccioConfig,
  Logger
} from '@verdaccio/types';
import express from 'express';
import { middleware } from '../middleware';
import bind from 'bind-decorator';
import assert from 'assert';
import { callbackify } from '../utils/decorators/callbackify';
import { OIDCController, OIDCControllerConfig } from '../oidc-controller';
import { AuthenticationStore, AuthenticationStoreConfig } from '../auth/store';
import { MiddlewareConfig } from '../middleware';

/**
 * Since we don't opt in to the config merging madness, that is further detailed
 * in #1394, the global `PluginOptions` are just plain from our POV:
 *
 * ```ts
 * { config: VerdaccioConfig, logger: Logger }
 * ```
 *
 * @see https://github.com/verdaccio/verdaccio/issues/1394
 */
type VerdaccioPluginConfig = PluginOptions<{}>;

/**
 * The config of the `auth` section for `oidc` in the config `.yml`.
 */
export interface AuthConfig extends OIDCControllerConfig {
  store: AuthenticationStoreConfig;
}

/**
 * The joint config of the `auth` and `middlewares` (plural intended) sections
 * for `oidc` in the config `.yml`.
 */
export interface VerdaccioOIDCPluginConfig {
  auth: AuthConfig;
  middleware: MiddlewareConfig;
}

export class VerdaccioOIDCPlugin
  implements
    // https://github.com/verdaccio/flow-types/pull/71
    Omit<IPluginAuth<{}>, 'adduser' | 'changePassword'>,
    IPluginMiddleware<{}> {
  static instances = new WeakMap<VerdaccioConfig, VerdaccioOIDCPlugin>();

  public readonly config: VerdaccioOIDCPluginConfig;
  public readonly verdaccioConfig: VerdaccioConfig;

  public readonly logger: Logger;
  public readonly oidcController: OIDCController;
  public readonly authenticationStore: AuthenticationStore;
  private middleware!: ReturnType<typeof middleware>;

  public readonly ready: Promise<true>;

  constructor(
    config: VerdaccioOIDCPluginConfig,
    { config: verdaccioConfig, logger }: VerdaccioPluginConfig
  ) {
    this.config = config;
    this.verdaccioConfig = verdaccioConfig;
    this.logger = logger;

    this.oidcController = new OIDCController({
      config: this.config.auth,
      logger
    });
    this.authenticationStore = new AuthenticationStore({
      config: this.config.auth.store,
      logger
    });

    this.ready = Promise.all([
      this.oidcController.ready,
      this.authenticationStore.ready
    ]).then(() => true as true);
  }

  /**
   * All of this is only necessary for two reasons:
   *
   * - To avoid the weirdness of merging the plugin's config with the global
   *   `VerdaccioConfig`, that you opt in to by using ES module imports.
   * - To share the same plugin instance for the auth and middleware part of
   *   this plugin.
   *
   * In `/index.js` we export this static method as `module.exports`.
   *
   * @see https://github.com/verdaccio/verdaccio/issues/1394
   *
   * @param config *just* the plugin config
   * @param options { config: VerdaccioConfig, logger: Logger }
   */
  @bind
  static createSingletonInstance(
    config: AuthConfig | MiddlewareConfig,
    options: VerdaccioPluginConfig
  ) {
    if (!this.instances.has(options.config)) {
      this.instances.set(
        options.config,
        new this(this.buildPluginConfig(options.config), options)
      );
    }
    return this.instances.get(options.config);
  }

  /**
   * Gets the `oidc` specific configs from the global verdaccio config.
   *
   * @param verdaccioConfig the full global verdaccio configuration
   */
  private static buildPluginConfig(
    verdaccioConfig: VerdaccioConfig
  ): VerdaccioOIDCPluginConfig {
    assert(
      verdaccioConfig.auth && 'oidc' in verdaccioConfig.auth,
      `Missing config for 'auth.oidc'`
    );
    assert(
      verdaccioConfig.middlewares && 'oidc' in verdaccioConfig.middlewares,
      `Missing config for 'middlewares.oidc'`
    );

    return {
      auth: verdaccioConfig.auth.oidc,

      // missing plural `s` intentional
      middleware: verdaccioConfig.middlewares.oidc
    };
  }

  register_middlewares(
    app: ReturnType<typeof express>,
    auth: IBasicAuth<VerdaccioPluginConfig>,
    storage: IStorageManager<VerdaccioPluginConfig>
  ): void {
    this.middleware = middleware(this);
    app.use(this.middleware);
  }

  @callbackify
  async authenticate(user: string, password: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  version?: string | undefined;
}
