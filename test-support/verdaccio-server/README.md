# Test Support Verdaccio Server

This directory contains a working `verdaccio` server that is configured to load
the `verdaccio-oidc` plugin from the repository root, so that you can easily
execute and test the plugin.

You can run `yarn load-config $ENV` to load any `config.$ENV.yml` file. When a
config is loaded all `${...}` expressions are substituted with their environment
variables counterpart. You can also add a `.env` file to the root of the
repository to permanently configure environment variables.

`yarn server` will launch the Verdaccio server with live-reload. When you update
a file in [`src`](../../src), the server restarts.

`yarn server:dev` will run `yarn load-config dev` and then `yarn server`.
