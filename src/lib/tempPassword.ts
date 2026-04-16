import { randomInt } from 'node:crypto';

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

/** Mot de passe provisoire lisible (min. 12 caractères, lettres + chiffres + casse). */
export function generateTemporaryPassword(): string {
  const pick = (pool: string) => pool[randomInt(pool.length)];
  let core = '';
  for (let i = 0; i < 8; i++) core += pick(LOWER + UPPER + DIGITS);
  return `${pick(UPPER)}${core}${pick(LOWER)}${pick(DIGITS)}!`;
}
