#!/usr/bin/env node

const { readFile, writeFile } = require('fs').promises;
const { resolve } = require('path');

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
}
module.exports = loadConfig;

// If this script is called directly via the CLI, execute it.
if (process.argv[1] === __filename) {
  require('hard-rejection/register');
  require('dotenv').config();

  loadConfig(process.argv[2]);
}
