'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AdminCabinetBrandingForm, type BrandingInitial } from '@/components/admin/AdminCabinetBrandingForm';
import { AdminStaffSection } from '@/components/admin/AdminStaffSection';
import {
  CABINET_PAYMENT_LABELS,
  PAYMENT_METHOD_CODES,
  type CabinetPaymentMethodCode,
} from '@/lib/payment-method-codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CURRENCIES = [
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'MAD', label: 'MAD — Dirham marocain' },
  { value: 'USD', label: 'USD — Dollar US' },
  { value: 'GBP', label: 'GBP — Livre sterling' },
  { value: 'CHF', label: 'CHF — Franc suisse' },
] as const;

type SettingsDto = {
  currency: string;
  defaultConsultationPrice: number;
  acceptedPaymentMethods: string[];
  signatureUrl: string | null;
  cabinetName: string | null;
  doctorDisplayName: string | null;
  logoUrl: string | null;
  cabinetPhone: string | null;
  cabinetEmail: string | null;
  cabinetAddress: string | null;
  cabinetCityLine: string | null;
  doctorInpe: string | null;
  doctorSpecialty: string | null;
  mapEmbedUrl: string | null;
  openingHours: unknown;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPasswordSet: boolean;
  updatedAt: string;
};

const financeCard =
  'rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [currency, setCurrency] = useState<string>('EUR');
  const [defaultConsultationPrice, setDefaultConsultationPrice] = useState<string>('0');
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<Set<CabinetPaymentMethodCode>>(
    () => new Set([...PAYMENT_METHOD_CODES])
  );
  const [signatureUrl, setSignatureUrl] = useState('');

  const togglePaymentMethod = (code: CabinetPaymentMethodCode) => {
    setAcceptedPaymentMethods((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await fetch('/api/admin/settings', { credentials: 'same-origin' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (!opts?.silent) toast.error(err?.error ?? 'Chargement des paramètres impossible');
        return;
      }
      const data: SettingsDto = await res.json();
      setSettings(data);
      setCurrency(data.currency);
      setDefaultConsultationPrice(String(data.defaultConsultationPrice ?? 0));
      const methods = (data.acceptedPaymentMethods ?? []).filter((m): m is CabinetPaymentMethodCode =>
        PAYMENT_METHOD_CODES.includes(m as CabinetPaymentMethodCode)
      );
      setAcceptedPaymentMethods(
        methods.length > 0 ? new Set(methods) : new Set([...PAYMENT_METHOD_CODES])
      );
      setSignatureUrl(data.signatureUrl ?? '');
    } catch {
      if (!opts?.silent) toast.error('Erreur réseau');
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const brandingInitial: BrandingInitial | null = useMemo(() => {
    if (!settings) return null;
    return {
      cabinetName: settings.cabinetName,
      doctorDisplayName: settings.doctorDisplayName,
      logoUrl: settings.logoUrl,
      cabinetPhone: settings.cabinetPhone,
      cabinetEmail: settings.cabinetEmail,
      cabinetAddress: settings.cabinetAddress,
      cabinetCityLine: settings.cabinetCityLine,
      doctorInpe: settings.doctorInpe,
      doctorSpecialty: settings.doctorSpecialty,
      mapEmbedUrl: settings.mapEmbedUrl,
      openingHours: settings.openingHours,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smtpFrom: settings.smtpFrom,
      smtpPasswordSet: Boolean(settings.smtpPasswordSet),
    };
  }, [settings]);

  const onSubmitFinancial = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(defaultConsultationPrice.replace(',', '.'));
    if (Number.isNaN(price) || price < 0) {
      toast.error('Indiquez un montant valide (≥ 0)');
      return;
    }
    if (acceptedPaymentMethods.size === 0) {
      toast.error('Sélectionnez au moins un mode de paiement');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          currency,
          defaultConsultationPrice: price,
          acceptedPaymentMethods: [...acceptedPaymentMethods],
          signatureUrl: signatureUrl.trim() === '' ? null : signatureUrl.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Enregistrement impossible');
        return;
      }
      toast.success('Paramètres financiers enregistrés');
      setCurrency(data.currency);
      setDefaultConsultationPrice(String(data.defaultConsultationPrice));
      if (Array.isArray(data.acceptedPaymentMethods)) {
        setAcceptedPaymentMethods(new Set(data.acceptedPaymentMethods as CabinetPaymentMethodCode[]));
      }
      setSignatureUrl(data.signatureUrl ?? '');
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              currency: data.currency,
              defaultConsultationPrice: data.defaultConsultationPrice,
              acceptedPaymentMethods: data.acceptedPaymentMethods,
              signatureUrl: data.signatureUrl ?? null,
              updatedAt: data.updatedAt ?? prev.updatedAt,
            }
          : prev
      );
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl space-y-10 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Paramètres</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Identité du cabinet, coordonnées publiques, facturation et équipe
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          Identité & contact publics
        </h2>
        <AdminCabinetBrandingForm
          initial={brandingInitial}
          loading={loading}
          onSaved={() => load({ silent: true })}
        />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          Paramètres financiers
        </h2>
        <div className={financeCard}>
          <p className="text-sm text-on-surface-variant">
            Devise, montant de référence et modes de paiement utilisés à la caisse et sur les factures.
          </p>

          {loading ? (
            <p className="mt-6 text-sm text-on-surface-variant">Chargement…</p>
          ) : (
            <form onSubmit={onSubmitFinancial} className="mt-6 max-w-md space-y-5">
              <div className="space-y-2">
                <Label htmlFor="admin-currency">Devise</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="admin-currency" className="border-outline-variant/20 bg-surface">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-default-price">Prix de consultation par défaut</Label>
                <div className="relative">
                  <Input
                    id="admin-default-price"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={defaultConsultationPrice}
                    onChange={(e) => setDefaultConsultationPrice(e.target.value)}
                    className="border-outline-variant/20 bg-surface pr-14"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
                    {currency}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant">
                  Montant proposé par défaut lors d’une nouvelle consultation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-signature-url">Signature médecin (URL image pour PDF ordonnances)</Label>
                <Input
                  id="admin-signature-url"
                  type="url"
                  placeholder="https://… ou /uploads/signature.png"
                  value={signatureUrl}
                  onChange={(e) => setSignatureUrl(e.target.value)}
                  className="border-outline-variant/20 bg-surface"
                />
                <p className="text-xs text-on-surface-variant">
                  Image PNG ou JPG accessible par le serveur.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Modes de paiement acceptés au cabinet</Label>
                <div className="grid gap-3 rounded-lg border border-outline-variant/15 bg-surface p-4 sm:grid-cols-2">
                  {PAYMENT_METHOD_CODES.map((code) => (
                    <label
                      key={code}
                      className="flex cursor-pointer items-center gap-3 text-sm font-medium text-on-surface"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                        checked={acceptedPaymentMethods.has(code)}
                        onChange={() => togglePaymentMethod(code)}
                      />
                      {CABINET_PAYMENT_LABELS[code]}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-b from-blue-500 to-blue-600 shadow-medical"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer les paramètres financiers'}
              </Button>
            </form>
          )}
        </div>
      </section>

      <AdminStaffSection variant="block" sectionTitle="Personnel" />
    </div>
  );
}
