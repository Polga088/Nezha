'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Loader2,
  Package,
  Plus,
  Printer,
  Search,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { normalizeMedicamentLine } from '@/lib/prescription-normalize';
import type { MedicamentLine } from '@/lib/prescription-types';
import { parseMedicamentsJson } from '@/lib/prescription-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from '@/lib/utils';

const TEMPLATES_KEY = '/api/prescription-templates';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

type TemplateRow = {
  id: string;
  titre: string;
  contenu: unknown;
};

const medRowSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  dosage: z.string().optional(),
  duree: z.string().optional(),
  /** Conservé pour renouvellement (texte posologie d’origine) — non affiché */
  posologie: z.string().optional(),
});

const prescriptionFormSchema = z.object({
  lines: z.array(medRowSchema).min(1),
  diagnosticAssocie: z.string().optional(),
  conseils: z.string().optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>;

export type RenewPrescriptionPayload = {
  medicaments: MedicamentLine[];
  conseils: string | null;
  diagnosticAssocie?: string | null;
} | null;

type Props = {
  patientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Dernier diagnostic dossier (consultations) — prérempli */
  defaultDiagnostic: string;
  renewPayload: RenewPrescriptionPayload;
  onRenewConsumed: () => void;
  onSaved: () => void;
};

const emptyRow = (): PrescriptionFormValues['lines'][number] => ({
  nom: '',
  dosage: '',
  duree: '',
  posologie: '',
});

export function PrescriptionForm({
  patientId,
  open,
  onOpenChange,
  defaultDiagnostic,
  renewPayload,
  onRenewConsumed,
  onSaved,
}: Props) {
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedPrescriptionId, setSavedPrescriptionId] = useState<string | null>(null);

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      lines: [emptyRow()],
      diagnosticAssocie: '',
      conseils: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });

  const { data: templates, isLoading: templatesLoading } = useSWR<TemplateRow[]>(
    open ? TEMPLATES_KEY : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const resetToNew = useCallback(() => {
    form.reset({
      lines: [emptyRow()],
      diagnosticAssocie: defaultDiagnostic.trim() || '',
      conseils: '',
    });
    setSearch('');
    setSavedPrescriptionId(null);
  }, [defaultDiagnostic, form]);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    setSavedPrescriptionId(null);
    if (renewPayload) {
      const meds = renewPayload.medicaments.length
        ? renewPayload.medicaments.map((m) => ({
            nom: m.nom,
            dosage: m.dosage?.trim() ?? '',
            duree: m.duree?.trim() ?? '',
            posologie: m.posologie ?? '',
          }))
        : [emptyRow()];
      form.reset({
        lines: meds,
        diagnosticAssocie:
          renewPayload.diagnosticAssocie?.trim() ||
          defaultDiagnostic.trim() ||
          '',
        conseils: renewPayload.conseils ?? '',
      });
      onRenewConsumed();
      return;
    }
    resetToNew();
  }, [
    open,
    renewPayload,
    onRenewConsumed,
    defaultDiagnostic,
    form,
    resetToNew,
  ]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handlePrint = () => {
    if (!savedPrescriptionId) return;
    window.open(
      `/dashboard/patients/${patientId}/prescriptions/${savedPrescriptionId}/print`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleOpenPdf = () => {
    if (!savedPrescriptionId) return;
    window.open(
      `/api/prescriptions/${savedPrescriptionId}/pdf`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const addFromSearch = () => {
    const nom = search.trim();
    if (!nom) {
      toast.error('Saisissez un nom de médicament');
      return;
    }
    append({
      nom,
      dosage: '',
      duree: '',
      posologie: '',
    });
    setSearch('');
  };

  const applyTemplate = (t: TemplateRow) => {
    const parsed = parseMedicamentsJson(t.contenu);
    if (!parsed?.length) {
      toast.error('Modèle vide ou invalide');
      return;
    }
    for (const m of parsed) {
      append({
        nom: m.nom,
        dosage: m.dosage?.trim() ?? '',
        duree: m.duree?.trim() ?? '',
        posologie: m.posologie ?? '',
      });
    }
    toast.success(`Pack « ${t.titre} » ajouté`);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const medicaments = values.lines
      .map((l) =>
        normalizeMedicamentLine({
          nom: l.nom,
          dosage: l.dosage,
          duree: l.duree,
          posologie: l.posologie,
        })
      )
      .filter((l) => l.nom.trim().length > 0);

    if (medicaments.length === 0) {
      toast.error('Au moins un médicament avec un nom est requis');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/prescriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          medicaments,
          diagnosticAssocie: values.diagnosticAssocie?.trim() || null,
          conseils: values.conseils?.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === 'string' ? data.error : 'Enregistrement impossible');
        return;
      }
      if (typeof data.id !== 'string') {
        toast.error('Réponse serveur invalide');
        return;
      }
      toast.success('Ordonnance enregistrée');
      setSavedPrescriptionId(data.id);
      onSaved();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  });

  const showSuccess = Boolean(savedPrescriptionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,920px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[960px]">
        <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="h-5 w-5 text-blue-600" aria-hidden />
            Nouvelle ordonnance
          </DialogTitle>
          <DialogDescription>
            Saisie rapide, diagnostic lié au dossier, puis impression du PDF cabinet.
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="flex flex-col gap-6 px-6 py-8">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-5 text-center sm:text-left">
              <p className="text-sm font-semibold text-emerald-900">
                Ordonnance enregistrée dans le dossier.
              </p>
              <p className="mt-1 text-xs text-emerald-800/90">
                Vue A4 optimisée pour l’impression ; le PDF reste disponible en secours.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="order-2 sm:order-1"
                onClick={() => {
                  handleClose();
                }}
              >
                Fermer
              </Button>
              <Button
                type="button"
                variant="outline"
                className="order-3 gap-2 sm:order-2"
                onClick={handleOpenPdf}
              >
                Télécharger le PDF
              </Button>
              <Button
                type="button"
                className="order-1 gap-2 bg-gradient-to-b from-blue-500 to-blue-600 shadow-md sm:order-3"
                onClick={handlePrint}
              >
                <Printer className="h-4 w-4" aria-hidden />
                Imprimer (vue A4)
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-6">
                  <FormField
                    control={form.control}
                    name="diagnosticAssocie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-slate-800">
                          <Stethoscope className="h-4 w-4 text-blue-600" aria-hidden />
                          Diagnostic associé
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Prérempli depuis la dernière consultation — modifiable."
                            className="resize-y border-slate-200 bg-white text-sm"
                          />
                        </FormControl>
                        <p className="text-xs text-slate-500">
                          Visible sur le PDF si renseigné (contexte clinique).
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Médicaments
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        placeholder="Ajouter un médicament (nom)"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addFromSearch();
                          }
                        }}
                        className="bg-white"
                        autoComplete="off"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="shrink-0 gap-1"
                        onClick={addFromSearch}
                      >
                        <Search className="h-4 w-4" aria-hidden />
                        Ajouter
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {fields.map((f, index) => (
                      <div
                        key={f.id}
                        className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 shadow-sm"
                      >
                        <p className="mb-2 text-xs font-medium text-slate-500">
                          Médicament {index + 1}
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.nom`}
                            render={({ field }) => (
                              <FormItem className="sm:col-span-2">
                                <FormLabel>Nom</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Ex. Amoxicilline"
                                    className="bg-white"
                                    autoComplete="off"
                                  />
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
                                  <Input
                                    {...field}
                                    placeholder="ex. 500 mg, 1 g"
                                    className="bg-white"
                                    autoComplete="off"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`lines.${index}.duree`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Durée</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="ex. 7 jours"
                                    className="bg-white"
                                    autoComplete="off"
                                  />
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
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            aria-label="Supprimer cette ligne"
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
                      className="w-full border-dashed border-blue-200 text-blue-700"
                      onClick={() => append(emptyRow())}
                    >
                      <Plus className="mr-2 h-4 w-4" aria-hidden />
                      Ajouter une ligne
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="conseils"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conseils au patient</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Repos, hydratation, signes d’alerte…"
                            className="resize-y border-slate-200 bg-white text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <aside className="flex w-full shrink-0 flex-col border-t border-slate-100 bg-slate-50/60 lg:w-[248px] lg:border-l lg:border-t-0">
                  <div className="border-b border-slate-100/80 px-4 py-3">
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                      <Package className="h-4 w-4" aria-hidden />
                      Packs (1 clic)
                    </p>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto p-3 lg:max-h-[min(480px,60vh)]">
                    {templatesLoading && (
                      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                        Chargement…
                      </div>
                    )}
                    {!templatesLoading && (!templates || templates.length === 0) && (
                      <p className="py-4 text-center text-xs text-slate-500">
                        Aucun modèle (admin / seed).
                      </p>
                    )}
                    <ul className="space-y-2">
                      {templates?.map((t) => (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => applyTemplate(t)}
                            className={cn(
                              'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60'
                            )}
                          >
                            {t.titre}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </aside>
              </div>

              <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-b from-blue-500 to-blue-600 shadow-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Enregistrement…
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" aria-hidden />
                      Enregistrer l&apos;ordonnance
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
