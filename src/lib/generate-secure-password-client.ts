/** Générateur navigateur (crypto.getRandomValues), même logique que `generateTemporaryPassword` côté serveur. */

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

const pick = (pool: string) => {
  const u = new Uint32Array(1);
  crypto.getRandomValues(u);
  return pool[u[0] % pool.length];
};

/** Mot de passe lisible (min. 12 caractères, lettres + chiffres + casse). */
export const generateSecurePasswordClient = (): string => {
  let core = '';
  for (let i = 0; i < 8; i += 1) core += pick(LOWER + UPPER + DIGITS);
  return `${pick(UPPER)}${core}${pick(LOWER)}${pick(DIGITS)}!`;
};
