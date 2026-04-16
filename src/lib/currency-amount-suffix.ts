/** Suffixe court affiché à côté des montants (hors Intl formatMoney). */
export function currencyAmountSuffix(currency: string): string {
  const c = String(currency || '')
    .trim()
    .toUpperCase();
  if (c === 'MAD') return 'dh';
  if (c === 'EUR') return '€';
  if (c === 'USD') return '$';
  if (c === 'GBP') return '£';
  if (c === 'CHF') return 'CHF';
  return c || '€';
}
