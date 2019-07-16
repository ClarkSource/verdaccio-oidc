const { promisify } = require('util');
const { randomBytes } = require('crypto');

const randomBytesPromisified = promisify(randomBytes);

// eslint-disable-next-line func-names
module.exports = async function getRandomToken(size = 64) {
  const buffer = await randomBytesPromisified(size);
  return buffer.toString('hex');
};
