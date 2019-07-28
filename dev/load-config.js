#!/usr/bin/env node

const { readFile, writeFile } = require('fs').promises;
const { resolve } = require('path');

/**
 * Loads the corresponding `config.${environment}.yml` file from the
 * `verdaccio-server` directory. It then substitutes all `${...}` expressions
 * with variables from `process.env`. The result is written to `config.yml`,
 * which can then be loaded by Verdaccio.
 *
 * This is basically a low-fidelity version of `envsubst`.
 *
 * @see ../test-support/verdaccio-server
 * @see https://www.gnu.org/software/gettext/manual/html_node/envsubst-Invocation.html
 *
 * @param {string} environment
 * @returns {Promise<string>} The processed template content.
 */
async function loadConfig(environment) {
  const template = await readFile(
    resolve(
      __dirname,
      `../test-support/verdaccio-server/config.${environment}.yml`
    ),
    'utf-8'
  );

  const processed = template.replace(/\$\{([^}]+)\}/g, (_, name) => {
    if (process.env[name]) return process.env[name];

    console.warn(`Environment variable '${name}' is empty.`);
    return '';
  });

  await writeFile(
    resolve(__dirname, `../test-support/verdaccio-server/config.yml`),
    processed
  );

  return processed;
}
module.exports = loadConfig;

/**
 * If this script is called directly via the CLI, execute it.
 * The following would load the `config.dev.yml` file.
 *
 * ```bash
 * ./load-config.js dev
 * ```
 */
if (process.argv[1] === __filename) {
  require('hard-rejection/register');
  require('dotenv').config();

  loadConfig(process.argv[2]);
}
