'use strict';

// eslint-disable-next-line node/no-deprecated-api
if (!require.extensions['.ts']) {
  const options = {
    project: `${__dirname}/../tsconfig.json`,

    // Otherwise the `use strict` statement is inserted and toggles on strict
    // mode, which can break other plugins, that rely on sloppy mode.
    // In the prod build `verdaccio-oidc` is still compiled in strict mode.
    compilerOptions: { strict: false }
  };

  // If we're operating in the context of another project, which might happen
  // if someone has installed `verdaccio-oidc` from git, only perform
  // transpilation and skip the default ignore glob (which prevents anything
  // in node_modules from being transpiled)
  if (process.cwd() !== __dirname) {
    options.skipIgnore = true;
    options.transpileOnly = true;
  }

  require('ts-node').register(options);
}
