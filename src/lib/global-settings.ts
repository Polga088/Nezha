import { prisma } from '@/lib/prisma';
import { PAYMENT_METHOD_CODES } from '@/lib/payment-method-codes';

const DEFAULT_METHODS = [...PAYMENT_METHOD_CODES];

/** Garantit la ligne unique `default` (devise, paiements, identité cabinet). */
export async function ensureGlobalSettings() {
  return prisma.globalSettings.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      currency: 'EUR',
      defaultConsultationPrice: 0,
      acceptedPaymentMethods: DEFAULT_METHODS,
      signatureUrl: null,
    },
    update: {},
  });
}
