import {
  IPluginMiddleware,
  IPluginAuth,
  IBasicAuth,
  IStorageManager,
  PluginOptions,
  Config as VerdaccioConfig,
  Logger
} from '@verdaccio/types';
import { VerdaccioOIDCMiddleware } from './middleware';
import bind from 'bind-decorator';
import assert from 'assert';

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
 * The joint config of the `auth` and `middlewares` (plural intended) sections
 * for `oidc` of the config `.yml`.
 */
export interface VerdaccioOIDCPluginConfig {
  auth: {};
  middleware: {};
}

export class VerdaccioOIDCPlugin
  implements
    // https://github.com/verdaccio/flow-types/pull/71
    Omit<IPluginAuth<{}>, 'adduser' | 'changePassword'>,
    IPluginMiddleware<{}> {
  static instances = new WeakMap<VerdaccioConfig, VerdaccioOIDCPlugin>();

  private config: VerdaccioOIDCPluginConfig;
  private verdaccioConfig: VerdaccioConfig;

  private logger: Logger;
  private middleware!: VerdaccioOIDCMiddleware;

  constructor(
    config: VerdaccioOIDCPluginConfig,
    { config: verdaccioConfig, logger }: VerdaccioPluginConfig
  ) {
    this.config = config;
    this.verdaccioConfig = verdaccioConfig;
    this.logger = logger;
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
    config:
      | VerdaccioOIDCPluginConfig['auth']
      | VerdaccioOIDCPluginConfig['middleware'],
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
    app: any,
    auth: IBasicAuth<VerdaccioOIDCPlugin>,
    storage: IStorageManager<VerdaccioPluginConfig>
  ): void {
    this.middleware = new VerdaccioOIDCMiddleware();
    app.use(this.middleware.callback());
  }

  authenticate(
    user: string,
    password: string,
    callback: (error: Error | null, groups: string[]) => void
  ): void {
    throw new Error('Method not implemented.');
  }

  version?: string | undefined;
}
