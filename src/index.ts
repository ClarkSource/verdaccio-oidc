export * from './plugin';

/**
 * The plugin needs to be exported as the default export of a pseudo ES6 module.
 * Verdaccio will then, and only then, invoke it with the `new` operator.
 *
 * Ironically, because of a lot of weirdness in the plugin system, that I
 * described in greater detail in #1394, this currently not favorable for us.
 * Instead we strip of the `default` part in `/index.js`, so that we get invoked
 * like a function, so that we get to implement a singleton pattern.
 *
 * @see https://github.com/verdaccio/verdaccio/blob/4f87750c180abcc000f23c3873919b6dc682b9f5/src/lib/plugin-loader.ts#L103
 * @see https://github.com/verdaccio/verdaccio/issues/1394
 */
import { VerdaccioOIDCPlugin } from './plugin';
export default VerdaccioOIDCPlugin.createSingletonInstance;
