import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';

function maxFractionDigits(value: number): number {
  return Math.abs(value) >= 1000 ? 0 : 2;
}

/** Montant formaté fr-FR + suffixe cabinet (ex. MAD → dh, EUR → €). */
export function formatCabinetMoney(value: number, currency: string): string {
  const code = (currency || 'EUR').trim().toUpperCase() || 'EUR';
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits(value),
  }).format(value);
  return `${formatted}\u00a0${currencyAmountSuffix(code)}`;
}
