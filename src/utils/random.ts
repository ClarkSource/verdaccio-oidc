import { randomBytes } from 'crypto';

export async function randomHex(bytes = 32) {
  const buffer = await randomBytes(bytes);
  return buffer.toString('hex');
}
