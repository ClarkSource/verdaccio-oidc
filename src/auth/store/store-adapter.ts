export interface StoreAdapterConfig {
  enabled?: boolean;
}

export enum AuthenticationState {
  PENDING,
  TIMED_OUT,
  FAILED,
  REVOKED,
  AUTHENTICATED
}

export interface User {
  id: string;

  npmToken: string;
  authenticationInitializationToken?: string;

  state: AuthenticationState;
}

export interface PendingUser extends User {
  authenticationInitializationToken: string;
  state: AuthenticationState.PENDING;
}

export interface StoreAdapter {
  boot(): void | Promise<void>;

  createUser(data: {
    state: AuthenticationState;
    npmToken: string;
    authenticationInitializationToken: string;
  }): Promise<User>;

  updateUser(data: Partial<User> & Pick<User, 'id'>): Promise<User>;

  findUserByNPMToken(npmToken: string): Promise<User | null>;
  findUserByAuthenticationInitializationToken(
    authenticationInitializationToken: string
  ): Promise<User | null>;

  subscribeStateChange(id: string): StateChangeSubscription;
}

export interface StateChangeSubscription {
  [Symbol.asyncIterator](): AsyncIterator<AuthenticationState>;

  close(): void;
}
