'use client';

import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR from 'swr';
import { Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

const lineSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  dosage: z.string().optional(),
  duree: z.string().optional(),
});

const quickSchema = z.object({
  lines: z.array(lineSchema).min(1),
  doctorId: z.string().optional(),
});

type QuickValues = z.infer<typeof quickSchema>;

type Props = {
  patientId: string;
  onSaved: (prescriptionId: string) => void;
  className?: string;
};

export function PatientQuickPrescriptionForm({ patientId, onSaved, className }: Props) {
  const { data: me } = useSWR<{ role?: string }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  });
  const role = String(me?.role ?? '').toUpperCase();
  const showDoctorPick = role === 'ADMIN' || role === 'ASSISTANT';

  const { data: doctors } = useSWR<Array<{ id: string; nom: string }>>(
    showDoctorPick ? '/api/users/doctors' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const form = useForm<QuickValues>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      lines: [{ nom: '', dosage: '', duree: '' }],
      doctorId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lines' });

  const onSubmit = form.handleSubmit(async (values) => {
    const body: {
      medicaments: Array<{ nom: string; dosage?: string; duree?: string }>;
      doctorId?: string;
    } = {
      medicaments: values.lines.map((l) => ({
        nom: l.nom.trim(),
        ...(l.dosage?.trim() ? { dosage: l.dosage.trim() } : {}),
        ...(l.duree?.trim() ? { duree: l.duree.trim() } : {}),
      })),
    };
    if (showDoctorPick && values.doctorId?.trim()) {
      body.doctorId = values.doctorId.trim();
    }

    try {
      const res = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        toast.error(typeof data.error === 'string' ? data.error : 'Enregistrement impossible');
        return;
      }
      if (typeof data.id !== 'string') {
        toast.error('Réponse invalide');
        return;
      }
      toast.success('Ordonnance enregistrée');
      form.reset({
        lines: [{ nom: '', dosage: '', duree: '' }],
        doctorId: form.getValues('doctorId'),
      });
      onSaved(data.id);
    } catch {
      toast.error('Erreur réseau');
    }
  });

  const saving = form.formState.isSubmitting;

  return (
    <Card className={cn('border-sky-100/80 shadow-sm', className)}>
      <CardHeader className="border-b border-sky-100/60 bg-sky-50/40 pb-4">
        <CardTitle className="text-base text-slate-900">Ordonnance rapide</CardTitle>
        <CardDescription>
          Ajoutez des lignes (nom, dosage, durée). La posologie est dérivée automatiquement pour le
          PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {showDoctorPick && (
              <div className="space-y-2">
                <Label htmlFor="rx-doctor">Médecin prescripteur</Label>
                <FormField
                  control={form.control}
                  name="doctorId"
                  render={({ field }) => (
                    <FormItem>
                      <Select
                        value={field.value?.trim() ? field.value : '__default'}
                        onValueChange={(v) => field.onChange(v === '__default' ? '' : v)}
                      >
                        <FormControl>
                          <SelectTrigger id="rx-doctor" className="bg-white">
                            <SelectValue placeholder="Médecin par défaut du cabinet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__default">Médecin par défaut (cabinet)</SelectItem>
                          {(doctors ?? []).map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="space-y-3">
              {fields.map((f, index) => (
                <div
                  key={f.id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-sm"
                >
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Médicament {index + 1}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name={`lines.${index}.nom`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-3">
                          <FormLabel>Nom</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex. Paracétamol" autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lines.${index}.dosage`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dosage</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ex. 500 mg" autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lines.${index}.duree`}
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Durée</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ex. 5 jours" autoComplete="off" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:bg-rose-50"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                      Retirer
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={() => append({ nom: '', dosage: '', duree: '' })}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Ajouter un médicament
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="gap-2 bg-gradient-to-b from-sky-500 to-sky-600"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="h-4 w-4" aria-hidden />
                )}
                Enregistrer l&apos;ordonnance
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
