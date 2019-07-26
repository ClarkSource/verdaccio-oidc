import {
  StoreAdapter,
  StoreAdapterConfig,
  AuthenticationState,
  User,
  StateChangeSubscription
} from '../store-adapter';
import { randomHex } from '../../../utils/random';
import pDefer from 'p-defer';

export interface MemoryAdapterConfig extends StoreAdapterConfig {}

/**
 * Volatile in-memory adapter.
 *
 * @warning All state is lost when the process quits. Only use this for testing.
 * @warning This adapter will not work on a cluster setup.
 * @warning Uniqueness constraints are not sufficiently verified.
 */
export class MemoryAdapter implements StoreAdapter {
  private readonly userByID = new Map<string, User>();
  private readonly usersByNpmToken = new Map<string, User>();
  private readonly subscriptions = new Map<
    string,
    Set<MemoryAdapterStateChangeSubscription>
  >();

  constructor(config: MemoryAdapterConfig) {}

  boot() {}

  async createUser(data: {
    state: AuthenticationState;
    npmToken: string;
    authenticationInitializationToken: string;
  }): Promise<User> {
    const user = { ...data, id: await randomHex(8) };
    this.userByID.set(user.id, user);
    this.usersByNpmToken.set(user.npmToken, user);
    return user;
  }

  async findUserByNPMToken(npmToken: string): Promise<User | null> {
    if (!this.usersByNpmToken.has(npmToken)) {
      throw new Error(`Unknown user by npm token: ${npmToken.slice(0, 8)}`);
    }
    return this.usersByNpmToken.get(npmToken)!;
  }

  subscribeStateChange(id: string): StateChangeSubscription {
    const subscription = new MemoryAdapterStateChangeSubscription(s =>
      activeSubscriptions.delete(s)
    );

    if (!this.subscriptions.has(id)) {
      this.subscriptions.set(id, new Set());
    }
    const activeSubscriptions = this.subscriptions.get(id)!;
    activeSubscriptions.add(subscription);

    return subscription;
  }

  private emitStateChange(id: string, state: AuthenticationState) {
    if (this.subscriptions.has(id)) {
      for (const subscription of this.subscriptions.get(id)!) {
        subscription.emit(state);
      }
    }
  }
}

class MemoryAdapterStateChangeSubscription implements StateChangeSubscription {
  private deferred? = pDefer<AuthenticationState>();
  onClose: (s: MemoryAdapterStateChangeSubscription) => void;

  constructor(onClose: (s: MemoryAdapterStateChangeSubscription) => void) {
    this.onClose = onClose;
  }

  async *[Symbol.asyncIterator](): AsyncIterator<AuthenticationState> {
    while (this.deferred) {
      try {
        // eslint-disable-next-line no-await-in-loop
        yield await this.deferred.promise;
      } catch (error) {}
    }
  }

  close() {
    const { deferred } = this;
    if (deferred) {
      this.deferred = undefined;
      deferred.reject();
    }
    this.onClose(this);
  }

  emit(state: AuthenticationState) {
    const { deferred } = this;
    if (deferred) {
      this.deferred = pDefer();
      deferred.resolve(state);
    }
  }
}
