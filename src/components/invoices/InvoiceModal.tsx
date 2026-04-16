'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, CreditCard, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import {
  CABINET_PAYMENT_LABELS,
  type CabinetPaymentMethodCode,
} from '@/lib/payment-method-codes';

export type InvoiceModalPatient = {
  id: string;
  prenom: string;
  nom: string;
  cin: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: InvoiceModalPatient[];
};

function labelForPaymentCode(code: string): string {
  const c = code as CabinetPaymentMethodCode;
  return CABINET_PAYMENT_LABELS[c] ?? code;
}

export function InvoiceModal({ open, onOpenChange, patients }: Props) {
  const { settings, isLoading, isValidating, error } = useSettings(open);

  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [invoiceLines, setInvoiceLines] = useState([{ libelle: '', prix: '' }]);
  const [paymentMethodCode, setPaymentMethodCode] = useState<CabinetPaymentMethodCode | ''>('');

  const currencyCode = settings?.currency?.trim() || 'EUR';
  const amountSuffix = currencyAmountSuffix(currencyCode);

  const paymentOptions =
    settings?.acceptedPaymentMethods
      ?.map((code) => ({
        code: code as CabinetPaymentMethodCode,
        label: labelForPaymentCode(code),
      }))
      .filter((o) => o.label) ?? [];

  useEffect(() => {
    if (!open || !settings) return;
    const acc = settings.acceptedPaymentMethods ?? [];
    if (acc.length === 0) {
      setPaymentMethodCode('');
      return;
    }
    setPaymentMethodCode((prev) =>
      prev && acc.includes(prev) ? prev : (acc[0] as CabinetPaymentMethodCode)
    );
  }, [open, settings]);

  const settingsLoading = open && (isLoading || isValidating) && !settings;

  const addLine = () => setInvoiceLines((lines) => [...lines, { libelle: '', prix: '' }]);
  const removeLine = (idx: number) => {
    setInvoiceLines((lines) => {
      if (lines.length <= 1) return lines;
      return lines.filter((_, i) => i !== idx);
    });
  };
  const updateLine = (idx: number, field: 'libelle' | 'prix', value: string) => {
    setInvoiceLines((lines) => {
      const next = [...lines];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const totalTTC = invoiceLines.reduce((acc, line) => {
    const val = parseFloat(line.prix.replace(',', '.'));
    return acc + (Number.isNaN(val) ? 0 : val);
  }, 0);

  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return toast.error('Veuillez sélectionner un patient');
    if (totalTTC <= 0) return toast.error('Le montant total doit être supérieur à 0');
    if (!settings) return toast.error('Paramètres du cabinet indisponibles');
    if (paymentOptions.length === 0) {
      return toast.error('Aucun mode de paiement accepté n’est configuré dans les paramètres');
    }
    if (!paymentMethodCode || !settings.acceptedPaymentMethods.includes(paymentMethodCode)) {
      return toast.error('Choisissez une méthode de paiement parmi celles autorisées');
    }

    toast.info(
      "L'encaissement et la création de facture liée au dossier se font depuis la caisse ou l'agenda (RDV clôturé)."
    );
    onOpenChange(false);
    setSelectedPatientId('');
    setInvoiceLines([{ libelle: '', prix: '' }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:brightness-110">
          <Plus className="mr-2 h-4 w-4" /> Créer une Facture
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Nouvelle Facture
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm text-red-600">
            Impossible de charger les paramètres du cabinet. Réessayez plus tard.
          </p>
        )}

        <form onSubmit={handleCreateInvoice} className="mt-4 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Sélectionner un Patient</label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between"
                >
                  {selectedPatientId
                    ? `${patients.find((p) => p.id === selectedPatientId)?.prenom} ${patients.find((p) => p.id === selectedPatientId)?.nom.toUpperCase()}`
                    : 'Rechercher par nom ou CIN...'}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un patient..." />
                  <CommandList>
                    <CommandEmpty>Aucun patient trouvé.</CommandEmpty>
                    <CommandGroup>
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={patient.id}
                          onSelect={(currentValue) => {
                            setSelectedPatientId(
                              currentValue === selectedPatientId ? '' : currentValue
                            );
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 h-4 w-4',
                              selectedPatientId === patient.id ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {patient.prenom} {patient.nom.toUpperCase()}{' '}
                          {patient.cin && `(CIN: ${patient.cin})`}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <label className="text-sm font-semibold text-slate-700">Détails des prestations</label>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex gap-3 px-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                <div className="flex-1">Libellé de l&apos;acte</div>
                <div className="w-28 text-right">Prix Unitaire ({currencyCode})</div>
                <div className="w-8" />
              </div>
              {invoiceLines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    placeholder="Ex: Consultation Médicale"
                    value={line.libelle}
                    onChange={(e) => updateLine(idx, 'libelle', e.target.value)}
                    className="flex-1 bg-white"
                    required
                  />
                  <div className="relative w-28">
                    <Input
                      placeholder="0.00"
                      type="text"
                      inputMode="decimal"
                      value={line.prix}
                      onChange={(e) => updateLine(idx, 'prix', e.target.value)}
                      className="bg-white pr-10 text-right font-medium"
                      required
                      aria-label={`Prix unitaire en ${currencyCode}`}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500">
                      {settingsLoading ? '…' : amountSuffix}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(idx)}
                    disabled={invoiceLines.length === 1}
                    className="text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="mt-2 w-full border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Plus className="mr-2 h-4 w-4" /> Ajouter une ligne
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-4">
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-sm font-medium text-slate-600">Méthode de paiement</p>
              <select
                className="mt-1 flex h-9 w-full max-w-xs items-center rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                value={paymentMethodCode}
                onChange={(e) =>
                  setPaymentMethodCode(e.target.value as CabinetPaymentMethodCode | '')
                }
                disabled={settingsLoading || paymentOptions.length === 0}
                aria-label="Méthode de paiement"
              >
                {paymentOptions.map(({ code, label }) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
              {!settingsLoading && settings && paymentOptions.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Aucun mode de paiement activé : configurez-les dans Paramètres administrateur.
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="mb-1 text-sm font-semibold text-slate-500">Total TTC</p>
              <p className="text-3xl font-bold text-blue-600">
                {totalTTC.toFixed(2)} {settingsLoading ? '…' : amountSuffix}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-slate-900 text-white shadow-sm hover:bg-slate-800"
              disabled={settingsLoading || !!error || !settings}
            >
              Créer la Facture
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
