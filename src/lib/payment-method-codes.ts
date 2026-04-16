/** Codes stockés dans `GlobalSettings.acceptedPaymentMethods` (côté cabinet). */
export const PAYMENT_METHOD_CODES = ['CASH', 'CARD', 'CHECK', 'BANK_TRANSFER'] as const;
export type CabinetPaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number];

export const CABINET_PAYMENT_LABELS: Record<CabinetPaymentMethodCode, string> = {
  CASH: 'Espèces',
  CARD: 'Carte',
  CHECK: 'Chèque',
  BANK_TRANSFER: 'Virement',
};

export function isCabinetPaymentCode(s: unknown): s is CabinetPaymentMethodCode {
  return typeof s === 'string' && PAYMENT_METHOD_CODES.includes(s as CabinetPaymentMethodCode);
}
