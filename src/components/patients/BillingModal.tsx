'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { CreditCard, Loader2 } from 'lucide-react';

import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import {
  CABINET_PAYMENT_LABELS,
  type CabinetPaymentMethodCode,
} from '@/lib/payment-method-codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SETTINGS_KEY = '/api/admin/settings';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('settings');
  return res.json() as Promise<{
    currency: string;
    defaultConsultationPrice: number;
    acceptedPaymentMethods: string[];
    updatedAt: string;
  }>;
};

export type InvoiceFormData = {
  montant: string;
  methode: string;
  currency: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceFormData;
  setInvoiceData: React.Dispatch<React.SetStateAction<InvoiceFormData>>;
  onSubmit: () => void | Promise<void>;
};

function labelForCode(code: string): string {
  const c = code as CabinetPaymentMethodCode;
  return CABINET_PAYMENT_LABELS[c] ?? code;
}

function pickMethodLabel(
  acceptedCodes: string[],
  currentLabel: string
): string {
  const labels = acceptedCodes
    .map((code) => CABINET_PAYMENT_LABELS[code as CabinetPaymentMethodCode])
    .filter((x): x is string => Boolean(x));
  if (labels.includes(currentLabel)) return currentLabel;
  return labels[0] ?? '';
}

export function BillingModal({
  open,
  onOpenChange,
  invoiceData,
  setInvoiceData,
  onSubmit,
}: Props) {
  const { data: settings, isLoading, isValidating, error } = useSWR(
    open ? SETTINGS_KEY : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const appliedForOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      appliedForOpen.current = false;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !settings || isLoading) return;
    if (appliedForOpen.current) return;
    appliedForOpen.current = true;
    const codes = settings.acceptedPaymentMethods ?? [];
    setInvoiceData((prev) => ({
      montant: String(settings.defaultConsultationPrice ?? 0),
      methode: pickMethodLabel(codes, prev.methode),
      currency: settings.currency ?? 'EUR',
    }));
  }, [open, settings, isLoading, setInvoiceData]);

  const loading = open && (isLoading || isValidating) && !settings;
  const methods = settings?.acceptedPaymentMethods ?? [];
  const options = methods
    .map((code) => ({
      code,
      label: labelForCode(code),
    }))
    .filter((o) => o.label);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !settings) return;
    if (options.length === 0) return;
    void onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-600" />
            Facturer la consultation
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-600">
            Impossible de charger les paramètres du cabinet. Réessayez plus tard.
          </p>
        )}

        {loading && !error && (
          <div className="space-y-5 py-2" aria-busy="true" aria-label="Chargement des paramètres">
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm font-medium">Chargement des réglages…</span>
            </div>
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-32 rounded bg-slate-200" />
              <div className="h-10 max-w-[150px] rounded bg-slate-100" />
              <div className="h-4 w-40 rounded bg-slate-200 mt-4" />
              <div className="h-10 w-full rounded bg-slate-100" />
            </div>
          </div>
        )}

        {!loading && !error && settings && (
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Montant ({currencyAmountSuffix(settings.currency)})
              </label>
              <Input
                type="number"
                required
                min={0}
                step="0.01"
                value={invoiceData.montant}
                onChange={(e) =>
                  setInvoiceData((prev) => ({ ...prev, montant: e.target.value }))
                }
                className="font-semibold text-lg max-w-[150px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Méthode de paiement</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={invoiceData.methode}
                disabled={options.length === 0}
                onChange={(e) =>
                  setInvoiceData((prev) => ({ ...prev, methode: e.target.value }))
                }
              >
                {options.map((o) => (
                  <option key={o.code} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </select>
              {options.length === 0 && (
                <p className="text-xs text-amber-700">
                  Aucun mode de paiement activé. Contactez un administrateur (Paramètres cabinet).
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={options.length === 0}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                Facturer et PDF
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
