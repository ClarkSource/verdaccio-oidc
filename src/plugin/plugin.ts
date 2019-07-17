import {
  IPluginMiddleware,
  IPluginAuth,
  IBasicAuth,
  IStorageManager
} from '@verdaccio/types';

export interface PluginOptions {}

export class VerdaccioOIDCPlugin
  implements IPluginAuth<PluginOptions>, IPluginMiddleware<PluginOptions> {
  register_middlewares(
    app: any,
    auth: IBasicAuth<PluginOptions>,
    storage: IStorageManager<PluginOptions>
  ): void {
    throw new Error('Method not implemented.');
  }

  login_url?: string | undefined;
  authenticate(user: string, password: string, callback): void {
    throw new Error('Method not implemented.');
  }

  adduser(user: string, password: string, callback): void {
    throw new Error('Method not implemented.');
  }

  changePassword(
    user: string,
    password: string,
    newPassword: string,
    callback
  ): void {
    throw new Error('Method not implemented.');
  }

  version?: string | undefined;
}
