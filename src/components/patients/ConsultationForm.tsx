'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ClipboardPlus, Loader2, Save } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  CONSULTATION_TYPE_OPTIONS,
  DEFAULT_CONSULTATION_TYPE,
  type ConsultationTypeValue,
} from '@/lib/consultation-types';
import type { PatientConsultationRow } from '@/components/patients/ConsultationHistory';

const TA_OPTIONAL = z
  .string()
  .transform((value) => (value == null ? '' : String(value).trim()))
  .refine((value) => value === '' || /^\d{2,3}\/\d{2,3}$/.test(value), {
    message: 'Format xxx/xx (ex. 120/80)',
  });

const consultationSchema = z
  .object({
    type: z.string().optional(),
    motif: z.string().optional(),
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
    const motif = data.motif?.trim() || '';
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
      motif !== '' ||
      diag !== '' ||
      notes !== '';

    if (!hasAny) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Au moins un motif, une constante, un diagnostic ou des notes',
        path: ['motif'],
      });
    }
  });

export type ConsultationFormValues = z.infer<typeof consultationSchema>;

type ConsultationFormData = {
  type?: string | null;
  motif?: string | null;
  glycemie?: number | null;
  tensionArterielle?: string | null;
  battementCoeur?: number | null;
  diagnostic?: string | null;
  notes?: string | null;
  date?: string;
};

export type ConsultationFormProps = {
  patientId: string;
  onSaved?: () => void | Promise<void>;
  onConsultationUpdated?: (updatedConsultation: PatientConsultationRow) => void | Promise<void>;
  triggerClassName?: string;
  triggerLabel?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  consultationId?: string | null;
  initialValues?: ConsultationFormData;
  submitLabel?: string;
  submitPendingLabel?: string;
};

const nowValue = () => new Date().toISOString().slice(0, 16);

const toDatetimeLocalValue = (value?: string | null) => {
  if (!value) return nowValue();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowValue();
  return date.toISOString().slice(0, 16);
};

export function ConsultationForm({
  patientId,
  onSaved,
  triggerClassName,
  triggerLabel = 'Saisie constantes',
  dialogTitle = 'Consultation historique',
  dialogDescription = 'Type de consultation, motif, date, constantes, diagnostic et notes libres.',
  consultationId = null,
  initialValues,
  submitLabel = consultationId ? 'Enregistrer les modifications' : 'Enregistrer',
  submitPendingLabel = 'Enregistrement…',
  onConsultationUpdated,
}: ConsultationFormProps) {
  const isEditing = consultationId != null;
  const [open, setOpen] = useState(false);
  const [historicalDateEnabled, setHistoricalDateEnabled] = useState(isEditing);

  const defaultValues = useMemo<ConsultationFormValues>(
    () => ({
      type: (initialValues?.type?.trim() as ConsultationTypeValue | undefined) ?? DEFAULT_CONSULTATION_TYPE,
      motif: initialValues?.motif ?? '',
      glycemie:
        initialValues?.glycemie == null || Number.isNaN(initialValues.glycemie)
          ? ''
          : String(initialValues.glycemie),
      tensionArterielle: initialValues?.tensionArterielle ?? '',
      battementCoeur:
        initialValues?.battementCoeur == null || Number.isNaN(initialValues.battementCoeur)
          ? ''
          : String(initialValues.battementCoeur),
      diagnostic: initialValues?.diagnostic ?? '',
      notes: initialValues?.notes ?? '',
      date: toDatetimeLocalValue(initialValues?.date ?? null),
    }),
    [initialValues]
  );

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues);
    setHistoricalDateEnabled(isEditing);
  }, [defaultValues, form, isEditing, open]);

  const resetForm = () => {
    setHistoricalDateEnabled(isEditing);
    form.reset(defaultValues);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      resetForm();
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
    const motif = values.motif?.trim() || null;
    const diagnostic = values.diagnostic?.trim() || null;
    const notes = values.notes?.trim() || null;

    const date = new Date(values.date);
    if (Number.isNaN(date.getTime())) {
      toast.error('Date invalide');
      return;
    }
    if (!isEditing && historicalDateEnabled && date.getTime() > Date.now()) {
      toast.error('La date historique ne peut pas être dans le futur');
      return;
    }

    const typeValue = String(values.type ?? DEFAULT_CONSULTATION_TYPE).trim();
    const payload = {
      type: typeValue,
      motif,
      glycemie,
      battementCoeur,
      tensionArterielle,
      diagnostic,
      notes,
      date: date.toISOString(),
      ...(isEditing ? {} : { source: 'OUT_OF_APPOINTMENT' as const }),
    };

    try {
      const res = await fetch(
        isEditing
          ? `/api/patients/${patientId}/consultations/${consultationId}`
          : `/api/patients/${patientId}/consultations`,
        {
          method: isEditing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Enregistrement impossible');
        return;
      }
      if (data && typeof data === 'object' && 'id' in data) {
        await onConsultationUpdated?.(data as PatientConsultationRow);
      }
      await onSaved?.();
      toast.success(isEditing ? 'Consultation modifiée' : 'Consultation enregistrée');
      setOpen(false);
      resetForm();
    } catch {
      toast.error('Erreur réseau');
    }
  });

  const dateDisabled = !isEditing && !historicalDateEnabled;

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
          {!isEditing ? <ClipboardPlus className="h-4 w-4 shrink-0 text-blue-600" aria-hidden /> : null}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[min(90vh,720px)] overflow-y-auto border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de consultation</FormLabel>
                    <Select
                      value={field.value?.trim() ? field.value : DEFAULT_CONSULTATION_TYPE}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Choisir un type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONSULTATION_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                name="motif"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motif</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Motif de la consultation" autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isEditing ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="historical-date" className="text-sm font-medium text-slate-800">
                      Ajouter une consultation antérieure
                    </Label>
                    <p className="text-xs text-slate-500">
                      Laissez désactivé pour enregistrer à l’instant.
                    </p>
                  </div>
                  <Switch
                    id="historical-date"
                    checked={historicalDateEnabled}
                    onCheckedChange={setHistoricalDateEnabled}
                  />
                </div>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date et heure</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      disabled={dateDisabled}
                      className="font-mono text-sm bg-white"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {submitPendingLabel}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
