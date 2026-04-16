import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

import { getJwtSecretBytes } from '@/lib/jwt-env';

const JWT_SECRET = getJwtSecretBytes();

/** Durée de session côté navigateur (cookie maxAge) — 12 h en secondes */
export const AUTH_SESSION_MAX_AGE_SEC = 60 * 60 * 12;

/** Durée d’expiration du JWT (doit correspondre au cookie) */
export const AUTH_JWT_EXPIRES = '12h' as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signJwt(
  payload: Record<string, unknown>,
  expiresIn: string = AUTH_JWT_EXPIRES
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(JWT_SECRET);
}

export async function verifyJwt(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}
