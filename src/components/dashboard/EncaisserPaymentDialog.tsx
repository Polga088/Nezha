'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CABINET_PAYMENT_LABELS } from '@/lib/payment-method-codes';

const INVOICE_PAYMENT_MODES = ['CASH', 'CARD', 'CHECK'] as const;
type InvoicePaymentMode = (typeof INVOICE_PAYMENT_MODES)[number];

function normalizeAcceptedModes(methods: string[] | undefined): InvoicePaymentMode[] {
  if (!methods?.length) {
    return [...INVOICE_PAYMENT_MODES];
  }
  const allowed = new Set<string>(INVOICE_PAYMENT_MODES);
  const picked = methods.filter((m) => allowed.has(m)) as InvoicePaymentMode[];
  return picked.length > 0 ? picked : [...INVOICE_PAYMENT_MODES];
}

const encaissementSchema = z.object({
  montant: z
    .string()
    .trim()
    .min(1, 'Montant requis')
    .refine((s) => {
      const n = Number.parseFloat(s.replace(',', '.'))
      return !Number.isNaN(n) && n > 0
    }, 'Indiquez un montant valide'),
  modePaiement: z.enum(['CASH', 'CARD', 'CHECK']),
});

type EncaissementValues = z.infer<typeof encaissementSchema>;

type EncaisserPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string | null;
  patientLabel: string;
  /** Montant suggéré (ex. paramètre cabinet ou 300) */
  defaultMontant: number;
  currencyLabel: string;
  /** Depuis paramètres cabinet — si uniquement CASH, le mode est figé sans menu. */
  acceptedPaymentMethods?: string[];
  onPaid: () => void | Promise<void>;
};

export function EncaisserPaymentDialog({
  open,
  onOpenChange,
  appointmentId,
  patientLabel,
  defaultMontant,
  currencyLabel,
  acceptedPaymentMethods,
  onPaid,
}: EncaisserPaymentDialogProps) {
  const modes = useMemo(
    () => normalizeAcceptedModes(acceptedPaymentMethods),
    [acceptedPaymentMethods]
  );
  const cashOnlyLocked = modes.length === 1 && modes[0] === 'CASH';

  const form = useForm<EncaissementValues>({
    resolver: zodResolver(encaissementSchema),
    defaultValues: {
      montant: String(defaultMontant),
      modePaiement: 'CASH',
    },
  });

  useEffect(() => {
    if (!open || !appointmentId) return;
    const defaultMode = cashOnlyLocked ? 'CASH' : modes.includes('CASH') ? 'CASH' : modes[0];
    form.reset({
      montant: String(defaultMontant),
      modePaiement: defaultMode,
    });
  }, [open, appointmentId, defaultMontant, form, cashOnlyLocked, modes])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!appointmentId) return
    const montantNum = Number.parseFloat(values.montant.replace(',', '.'))
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          appointment_id: appointmentId,
          montant: montantNum,
          modePaiement: values.modePaiement,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Encaissement refusé')
        return
      }
      toast.success('Paiement enregistré — rendez-vous réglé')
      onOpenChange(false)
      await onPaid()
    } catch {
      toast.error('Erreur réseau')
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          // Évite l’ouverture intempestive du Select (focus initial sur le trigger).
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Encaisser</DialogTitle>
          <DialogDescription>
            {patientLabel} — enregistrement du règlement et génération de la facture.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="decimal"
                        autoComplete="transaction-amount"
                        className="pr-14"
                        {...field}
                        aria-label={`Montant en ${currencyLabel}`}
                      />
                    </FormControl>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {currencyLabel}
                    </span>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="modePaiement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  {cashOnlyLocked ? (
                    <>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800">
                        {CABINET_PAYMENT_LABELS.CASH}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          (seul mode accepté par le cabinet)
                        </span>
                      </div>
                      <FormControl>
                        <input type="hidden" {...field} />
                      </FormControl>
                    </>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="Mode de paiement">
                          <SelectValue placeholder="Choisir" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modes.includes('CASH') ? (
                          <SelectItem value="CASH">{CABINET_PAYMENT_LABELS.CASH}</SelectItem>
                        ) : null}
                        {modes.includes('CARD') ? (
                          <SelectItem value="CARD">{CABINET_PAYMENT_LABELS.CARD}</SelectItem>
                        ) : null}
                        {modes.includes('CHECK') ? (
                          <SelectItem value="CHECK">{CABINET_PAYMENT_LABELS.CHECK}</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-b from-blue-500 to-blue-600"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  'Confirmer le paiement'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
