'use client';

import { useCallback, useEffect, useState } from 'react';
import { Banknote, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

type Row = {
  id: string;
  motif: string;
  date_heure: string;
  patient: { id: string; nom: string; prenom: string; tel: string | null };
  doctor: { nom: string };
  invoice: { id: string; statut: string; montant: number } | null;
};

export default function AssistantCaissePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [currency, setCurrency] = useState<string>('MAD');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/assistant/pending-payments', { credentials: 'same-origin' });
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as Row[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/settings', { credentials: 'same-origin' });
        if (!res.ok) return;
        const data = (await res.json()) as { currency?: string };
        if (typeof data.currency === 'string' && data.currency.trim()) {
          setCurrency(data.currency.trim());
        }
      } catch {
        /* garde MAD par défaut */
      }
    })();
  }, []);

  const encaisser = async (appointmentId: string) => {
    const montant = amounts[appointmentId]?.trim();
    const methode = methods[appointmentId] ?? 'CASH';
    if (!montant || Number.parseFloat(montant.replace(',', '.')) <= 0) {
      toast.error('Indiquez un montant valide');
      return;
    }
    setPayingId(appointmentId);
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          appointment_id: appointmentId,
          montant: Number.parseFloat(montant.replace(',', '.')),
          methode_paiement: methode,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Encaissement refusé');
        return;
      }
      toast.success('Encaissement enregistré — RDV soldé');
      await load();
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Encaissement</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consultations clôturées par le médecin — saisie du règlement uniquement (pas d’accès aux statistiques
          détaillées).
        </p>
      </div>

      <Card className="shadow-premium border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5 text-emerald-600" />
            File d’attente de paiement
          </CardTitle>
          <CardDescription>
            Montant et mode de paiement — validation enregistre la facture et marque le RDV comme réglé.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10 border border-dashed border-slate-200 rounded-xl">
              Aucun patient en attente d’encaissement.
            </p>
          ) : (
            <ul className="space-y-6">
              {rows.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {r.patient.prenom} {r.patient.nom}
                    </p>
                    <p className="text-xs text-slate-500">Dr. {r.doctor.nom}</p>
                    <p className="text-sm text-slate-600 mt-1">{r.motif}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`m-${r.id}`}>
                        Montant ({currencyAmountSuffix(currency)})
                      </Label>
                      <Input
                        id={`m-${r.id}`}
                        inputMode="decimal"
                        placeholder="ex. 50"
                        value={amounts[r.id] ?? ''}
                        onChange={(e) => setAmounts((s) => ({ ...s, [r.id]: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mode</Label>
                      <Select
                        value={methods[r.id] ?? 'CASH'}
                        onValueChange={(v) => setMethods((s) => ({ ...s, [r.id]: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Espèces</SelectItem>
                          <SelectItem value="CARD">Carte</SelectItem>
                          <SelectItem value="CHECK">Chèque</SelectItem>
                          <SelectItem value="INSURANCE">Mutuelle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                    disabled={payingId === r.id}
                    onClick={() => void encaisser(r.id)}
                  >
                    {payingId === r.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Valider l’encaissement'
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
