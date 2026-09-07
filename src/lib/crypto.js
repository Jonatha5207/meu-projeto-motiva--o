import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, digest] = stored.split(':');
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(actual, Buffer.from(digest, 'hex'));
  } catch {
    return false;
  }
}

export function timingSafeEqualStrings(a, b) {
  const bufferA = Buffer.from(String(a || ''));
  const bufferB = Buffer.from(String(b || ''));
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}
