This directory contains a `package.json` with a `main` field that references the
[root `index.js`](../../../../index.js) file of this repository. This makes it
look like to Verdaccio as if the plugin was actually located here and allows us
to load the plugin we are actually working on in the test support
`verdaccio-server`.

The plugin loading system is arguably quite weird, due to legacy code, but its
improvement is planned.

- [#1394: Plugin System is weird](https://github.com/verdaccio/verdaccio/issues/1394)
- [#1357: Make plugin loading clear](https://github.com/verdaccio/verdaccio/issues/1357)
