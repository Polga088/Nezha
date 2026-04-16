/** Comparaison CIN tolérante (espaces, casse). */
export function cinMatches(input: string, stored: string | null | undefined): boolean {
  if (!stored || !input) return false;
  const a = input.trim().replace(/\s+/g, '').toUpperCase();
  const b = stored.trim().replace(/\s+/g, '').toUpperCase();
  return a.length > 0 && a === b;
}
