'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { ExternalLink, Paperclip, Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import useSWR from 'swr';

import { ExpenseForm } from '@/components/dashboard/ExpenseForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/expense-category';
import { formatCabinetMoney } from '@/lib/format-cabinet-money';
import type { ExpenseCategory } from '@/generated/prisma/client';

type ExpenseRow = {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  attachmentUrl: string | null;
};

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error('fetch failed');
    return r.json();
  });

const settingsFetcher = async () => {
  const res = await fetch('/api/admin/settings', { credentials: 'same-origin' });
  if (!res.ok) throw new Error();
  return res.json() as Promise<{ currency?: string }>;
};

function expenseAttachmentKind(url: string): 'pdf' | 'image' | 'other' {
  const path = url.split('?')[0].toLowerCase();
  if (path.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp)$/.test(path)) return 'image';
  return 'other';
}

export default function AdminExpensesPage() {
  const { data: expenses, mutate, isLoading } = useSWR<ExpenseRow[]>('/api/admin/expenses', fetcher);
  const { data: settings } = useSWR('/api/admin/settings', settingsFetcher);
  const currency = settings?.currency ?? 'EUR';
  const [preview, setPreview] = useState<{ url: string; label: string } | null>(null);
  const previewKind = preview ? expenseAttachmentKind(preview.url) : null;

  const handleRemove = async (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    try {
      const res = await fetch(`/api/admin/expenses/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        toast.error('Suppression impossible');
        return;
      }
      toast.success('Dépense supprimée');
      void mutate();
    } catch {
      toast.error('Erreur réseau');
    }
  };

  return (
    <div className="w-full min-w-0 animate-fade-in space-y-8">
      <Dialog open={preview != null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Justificatif</DialogTitle>
            <DialogDescription className="truncate">{preview?.label}</DialogDescription>
          </DialogHeader>
          {preview && previewKind === 'image' ? (
            <div className="flex max-h-[70vh] justify-center overflow-auto rounded-md border border-slate-100 bg-slate-50 p-2 dark:border-zinc-800 dark:bg-zinc-950">
              <img
                src={preview.url}
                alt={`Justificatif : ${preview.label}`}
                className="max-h-[68vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
          {preview && previewKind === 'pdf' ? (
            <iframe
              title={`PDF — ${preview.label}`}
              src={preview.url}
              className="h-[min(72vh,640px)] w-full rounded-md border border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            />
          ) : null}
          {preview && previewKind === 'other' ? (
            <p className="text-sm text-slate-600 dark:text-zinc-400">
              Prévisualisation non disponible pour ce fichier. Ouvrez-le dans un nouvel onglet.
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPreview(null)}>
              Fermer
            </Button>
            {preview ? (
              <Button type="button" className="gap-2" asChild>
                <a href={preview.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" aria-hidden />
                  Nouvel onglet
                </a>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
          Dépenses
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-zinc-400">
          Charges du cabinet — utilisées dans l&apos;analytique (bénéfice net).
        </p>
      </div>

      <Card className="rounded-2xl border-0 bg-white shadow-sm dark:bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg dark:text-zinc-100">
            <Wallet className="h-5 w-5 text-blue-600" />
            Nouvelle dépense
          </CardTitle>
          <CardDescription className="dark:text-zinc-400">
            Libellé, montant, catégorie, date et justificatif facultatif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm currency={currency} onSuccess={() => void mutate()} />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-0 bg-white shadow-sm dark:bg-zinc-900/40">
        <CardHeader>
          <CardTitle className="text-lg dark:text-zinc-100">Historique</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : !expenses?.length ? (
            <p className="text-sm text-slate-500 dark:text-zinc-500">Aucune dépense.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400 dark:border-zinc-800 dark:text-zinc-500">
                    <th className="pb-3 pr-4 font-medium">Dépense</th>
                    <th className="pb-3 pr-4 font-medium">Montant</th>
                    <th className="pb-3 w-24 text-center font-medium">Justificatif</th>
                    <th className="pb-3 w-12 text-right font-medium" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {expenses.map((ex) => (
                    <tr key={ex.id} className="align-middle">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900 dark:text-zinc-100">{ex.label}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">
                          {EXPENSE_CATEGORY_LABELS[ex.category]} ·{' '}
                          {format(new Date(ex.date), 'd MMM yyyy', { locale: fr })}
                        </p>
                      </td>
                      <td className="py-3 pr-4 font-semibold tabular-nums text-slate-800 dark:text-zinc-200">
                        {formatCabinetMoney(ex.amount, currency)}
                      </td>
                      <td className="py-3 text-center">
                        {ex.attachmentUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                            onClick={() =>
                              setPreview({ url: ex.attachmentUrl as string, label: ex.label })
                            }
                            aria-label={`Prévisualiser le justificatif : ${ex.label}`}
                          >
                            <Paperclip className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                          </Button>
                        ) : (
                          <span className="text-slate-300 dark:text-zinc-600" aria-hidden>
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
                          onClick={() => void handleRemove(ex.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
