'use client';

import { format } from 'date-fns';
import { Loader2, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EXPENSE_CATEGORY_LABELS, EXPENSE_CATEGORY_VALUES } from '@/lib/expense-category';
import type { ExpenseCategory } from '@/generated/prisma/client';
import { cn } from '@/lib/utils';

const expenseFormSchema = z.object({
  label: z.string().min(1, 'Libellé requis').max(500),
  amount: z.string().min(1, 'Montant requis'),
  category: z.enum(['LOYER', 'MATERIEL', 'SALAIRE', 'AUTRE']),
  date: z.string().min(1, 'Date requis'),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export type ExpenseFormProps = {
  currency: string;
  onSuccess?: () => void | Promise<void>;
  className?: string;
};

const ACCEPT_FILES = 'application/pdf,image/png,image/jpeg,image/jpg,image/webp';

export const ExpenseForm = ({ currency, onSuccess, className }: ExpenseFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      label: '',
      amount: '',
      category: 'AUTRE',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingFile(file);
  };

  const handleClearFile = () => setPendingFile(null);

  const handleSubmit = form.handleSubmit(async (values) => {
    const amt = parseFloat(values.amount.replace(',', '.'));
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error('Montant invalide');
      return;
    }

    let attachmentUrl: string | undefined;
    if (pendingFile) {
      setUploadingFile(true);
      try {
        const fd = new FormData();
        fd.append('file', pendingFile);
        const up = await fetch('/api/admin/expenses/upload', {
          method: 'POST',
          body: fd,
          credentials: 'same-origin',
        });
        const raw = await up.json().catch(() => ({}));
        if (!up.ok) {
          toast.error(typeof raw?.error === 'string' ? raw.error : 'Envoi du fichier impossible');
          return;
        }
        const url = typeof raw?.attachmentUrl === 'string' ? raw.attachmentUrl : '';
        if (!url.startsWith('/uploads/expenses/')) {
          toast.error('Réponse serveur invalide');
          return;
        }
        attachmentUrl = url;
      } catch {
        toast.error('Erreur réseau (fichier)');
        return;
      } finally {
        setUploadingFile(false);
      }
    }

    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          label: values.label.trim(),
          amount: amt,
          category: values.category,
          date: values.date,
          ...(attachmentUrl != null && { attachmentUrl }),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j?.error === 'string' ? j.error : 'Erreur');
        return;
      }
      toast.success('Dépense enregistrée');
      form.reset({
        label: '',
        amount: '',
        category: 'AUTRE',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setPendingFile(null);
      await onSuccess?.();
    } catch {
      toast.error('Erreur réseau');
    }
  });

  const submitting = form.formState.isSubmitting || uploadingFile;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Libellé</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Loyer" autoComplete="off" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pr-14"
                      autoComplete="off"
                      {...field}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      {currencyAmountSuffix(currency)}
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Catégorie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger aria-label="Catégorie">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPENSE_CATEGORY_VALUES.map((c: ExpenseCategory) => (
                      <SelectItem key={c} value={c}>
                        {EXPENSE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
            <p className="mb-2 text-sm font-medium text-slate-800 dark:text-zinc-200">
              Justificatif <span className="font-normal text-slate-500 dark:text-zinc-400">(facultatif)</span>
            </p>
            <div className="flex min-h-[40px] flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept={ACCEPT_FILES}
                aria-hidden
                tabIndex={-1}
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handlePickFile}
                className="h-9 gap-2 border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                aria-label="Téléverser un justificatif PDF ou image"
              >
                {uploadingFile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" aria-hidden />
                )}
                Téléverser un fichier
              </Button>
              {pendingFile ? (
                <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                  <span className="truncate">{pendingFile.name}</span>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800"
                    aria-label="Retirer le fichier"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-zinc-500">
                  PDF, PNG, JPEG ou WebP — max. 8 Mo. Envoyé avec le formulaire puis enregistré sur le serveur.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="w-full bg-gradient-to-b from-blue-500 to-blue-600 sm:w-auto"
            disabled={submitting}
          >
            {submitting ? 'Enregistrement…' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
