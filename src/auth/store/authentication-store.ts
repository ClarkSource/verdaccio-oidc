import { Logger } from '@verdaccio/types';
import {
  StoreAdapterConfig,
  StoreAdapter,
  AuthenticationState,
  PendingUser
} from './store-adapter';
import { getAdapter } from '.';
import { randomHex } from '../../utils/random';
import pProps from 'p-props';

export interface AuthenticationStoreConfig {
  adapter: Record<string, StoreAdapterConfig | null>;
}

/**
 * Expects the config to look like this:
 *
 * ```yml
 * auth:
 *   oidc:
 *     store:
 *       adapter:
 *         redis:
 *           someConfigForTheRedisAdapter: ...
 *           anotherOne: ...
 * ```
 *
 * Only a single adapter is allowed.
 *
 * @param adapter `auth.oidc.store.adapter` from the config `.yml`
 */
function createAdapterFromConfig({ adapter }: AuthenticationStoreConfig) {
  const enabledEntries = [...Object.entries(adapter)].filter(
    ([, config]) =>
      !config ||
      config.enabled === true ||
      typeof config.enabled === 'undefined'
  );
  if (enabledEntries.length === 0)
    throw new TypeError(
      `Provided no authentication store adapter config at 'auth.oidc.store.adapter'`
    );
  if (enabledEntries.length !== 1)
    throw new TypeError(
      `Provided more than one authentication store adapter config at 'auth.oidc.store.adapter'.`
    );

  // eslint-disable-next-line prefer-destructuring
  const [adapterName, adapterConfig] = enabledEntries[0];
  const Adapter = getAdapter(adapterName);

  return new Adapter(adapterConfig || undefined);
}

function stateToError(state: AuthenticationState) {
  switch (state) {
    case AuthenticationState.PENDING:
      return new AuthenticationPendingError();
    case AuthenticationState.TIMED_OUT:
      return new AuthenticationTimeoutError();
    case AuthenticationState.FAILED:
      return new AuthenticationFailedError();
    case AuthenticationState.REVOKED:
      return new AuthenticationRevokedError();
    default:
      return new AuthenticationUnexpectedStateError(
        `Unexpected authentication state: ${state}`
      );
  }
}

export class AuthenticationStore {
  private readonly config: AuthenticationStoreConfig;
  private readonly logger: Logger;

  private readonly adapter: StoreAdapter;

  public readonly ready: Promise<true>;

  constructor({
    config,
    logger
  }: {
    config: AuthenticationStoreConfig;
    logger: Logger;
  }) {
    this.config = config;
    this.logger = logger;

    this.adapter = createAdapterFromConfig(config);

    this.ready = this.boot().then(() => true as true);
  }

  async boot() {
    await this.adapter.boot();
  }

  async createPendingAuthentication() {
    return this.adapter.createUser({
      ...(await pProps({
        npmToken: randomHex(64),
        authenticationInitializationToken: randomHex(32)
      })),
      state: AuthenticationState.PENDING
    }) as Promise<PendingUser>;
  }

  async isPendingAuthentication(npmToken: string) {
    const user = await this.adapter.findUserByNPMToken(npmToken);
    if (!user) return false;

    switch (user.state) {
      case AuthenticationState.PENDING:
        return true;
      case AuthenticationState.FAILED:
        return false;
      default:
        throw stateToError(user.state);
    }
  }

  async waitForAuthentication(npmToken: string) {
    const user = await this.adapter.findUserByNPMToken(npmToken);
    if (!user) throw new AuthenticationNotFoundError();

    if (user.state === AuthenticationState.AUTHENTICATED) return true;
    if (user.state !== AuthenticationState.PENDING)
      throw new AuthenticationUnexpectedStateError(
        `Unexpected authentication state: ${user.state}`
      );

    const subscription = this.adapter.subscribeStateChange(user.id);
    for await (const state of subscription) {
      switch (state) {
        case AuthenticationState.PENDING:
          continue;
        case AuthenticationState.AUTHENTICATED:
          subscription.close();
          return;
        default:
          subscription.close();
          throw stateToError(state);
      }
    }
  }
}

export class AuthenticationError extends Error {}
export class AuthenticationNotFoundError extends Error {}
export class AuthenticationTimeoutError extends AuthenticationError {}
export class AuthenticationFailedError extends AuthenticationError {}
export class AuthenticationPendingError extends AuthenticationError {}
export class AuthenticationRevokedError extends AuthenticationError {}
export class AuthenticationUnexpectedStateError extends AuthenticationError {}
