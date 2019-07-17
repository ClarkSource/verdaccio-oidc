'use strict';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');

// If transpiled output is present, always default to loading that first.
// Otherwise, register ts-node if necessary and load from source.
if (fs.existsSync(`${__dirname}/dist/addon.js`)) {
  // eslint-disable-next-line node/no-missing-require
  module.exports = require('./dist').default;
} else {
  // eslint-disable-next-line node/no-unpublished-require
  require('./dev/register-ts-node');

  // eslint-disable-next-line node/no-unpublished-require
  module.exports = require('./src/index.ts').default;
}
