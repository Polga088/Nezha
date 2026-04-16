'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ClipboardPlus } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const TA_OPTIONAL = z
  .string()
  .transform((s) => (s == null ? '' : String(s).trim()))
  .refine((s) => s === '' || /^\d{2,3}\/\d{2,3}$/.test(s), {
    message: 'Format xxx/xx (ex. 120/80)',
  });

const consultationSchema = z
  .object({
    glycemie: z.string().optional(),
    tensionArterielle: TA_OPTIONAL,
    battementCoeur: z.string().optional(),
    diagnostic: z.string().optional(),
    notes: z.string().optional(),
    date: z.string().min(1, 'Date requise'),
  })
  .superRefine((data, ctx) => {
    const g =
      data.glycemie?.trim() === ''
        ? null
        : parseFloat(data.glycemie!.replace(/,/g, '.'));
    const b =
      data.battementCoeur?.trim() === ''
        ? null
        : parseInt(data.battementCoeur!, 10);
    const ta = data.tensionArterielle?.trim() || '';
    const diag = data.diagnostic?.trim() || '';
    const notes = data.notes?.trim() || '';

    if (g != null && (!Number.isFinite(g) || g < 20 || g > 600)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Glycémie entre 20 et 600 mg/dL',
        path: ['glycemie'],
      });
    }
    if (b != null && (!Number.isFinite(b) || b < 30 || b > 250)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BPM entre 30 et 250',
        path: ['battementCoeur'],
      });
    }

    const hasAny =
      (g != null && Number.isFinite(g)) ||
      (b != null && Number.isFinite(b)) ||
      ta !== '' ||
      diag !== '' ||
      notes !== '';

    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Au moins une constante, un diagnostic ou des notes',
        path: ['diagnostic'],
      });
    }
  });

export type ConsultationFormValues = z.infer<typeof consultationSchema>;

export type ConsultationFormProps = {
  patientId: string;
  onSaved?: () => void;
  triggerClassName?: string;
};

export function ConsultationForm({ patientId, onSaved, triggerClassName }: ConsultationFormProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      glycemie: '',
      tensionArterielle: '',
      battementCoeur: '',
      diagnostic: '',
      notes: '',
      date: new Date().toISOString().slice(0, 16),
    },
  });

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      form.reset({
        glycemie: '',
        tensionArterielle: '',
        battementCoeur: '',
        diagnostic: '',
        notes: '',
        date: new Date().toISOString().slice(0, 16),
      });
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    const glycemie =
      values.glycemie?.trim() === ''
        ? null
        : parseFloat(values.glycemie!.replace(/,/g, '.'));
    const battementCoeur =
      values.battementCoeur?.trim() === ''
        ? null
        : parseInt(values.battementCoeur!, 10);
    const tensionArterielle =
      values.tensionArterielle?.trim() === '' ? null : values.tensionArterielle!.trim();
    const diagnostic = values.diagnostic?.trim() || null;
    const notes = values.notes?.trim() || null;

    const local = new Date(values.date);
    if (Number.isNaN(local.getTime())) {
      toast.error('Date invalide');
      return;
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          glycemie,
          battementCoeur,
          tensionArterielle,
          diagnostic,
          notes,
          date: local.toISOString(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Enregistrement impossible');
        return;
      }
      toast.success('Consultation enregistrée');
      onSaved?.();
      setOpen(false);
      form.reset({
        glycemie: '',
        tensionArterielle: '',
        battementCoeur: '',
        diagnostic: '',
        notes: '',
        date: new Date().toISOString().slice(0, 16),
      });
    } catch {
      toast.error('Erreur réseau');
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={
            triggerClassName ??
            'gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
          }
        >
          <ClipboardPlus className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
          Saisie constantes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[min(90vh,640px)] overflow-y-auto border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Constantes & diagnostic</DialogTitle>
          <DialogDescription>
            Glycémie (mg/dL), tension (mmHg), BPM — diagnostic et notes libres.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date et heure</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} className="font-mono text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="glycemie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Glycémie</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="ex. 95"
                          className="pr-14"
                          {...field}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          mg/dL
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tensionArterielle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tension</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="120/80"
                          className="pr-14"
                          {...field}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          mmHg
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="battementCoeur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fréquence</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="ex. 72"
                          className="pr-12"
                          {...field}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          BPM
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="diagnostic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnostic</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Hypothèse ou diagnostic retenu…"
                      className="min-h-[72px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observations complémentaires…"
                      className="min-h-[72px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm"
              >
                {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
