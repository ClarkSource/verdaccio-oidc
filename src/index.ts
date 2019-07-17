export * from './plugin';

/**
 * The plugin needs to be exported as the default export of a pseudo ES6 module.
 * Verdaccio will then, and only then, invoke it with the `new` operator.
 *
 * @see https://github.com/verdaccio/verdaccio/blob/4f87750c180abcc000f23c3873919b6dc682b9f5/src/lib/plugin-loader.ts#L103
 */
export { VerdaccioOIDCPlugin as default } from './plugin';
