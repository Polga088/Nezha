'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Form } from '@/components/ui/form';
import { ASSURANCE_TYPE_VALUES } from '@/lib/assurance-types';
import { zOptionalPatientTel } from '@/lib/patient-fields';
import { PatientAssuranceFormSection } from '@/components/patients/PatientForm';

const formSchema = z.object({
  nom: z.string().min(1, 'Nom requis').min(2, 'Au moins 2 caractères'),
  prenom: z.string().min(1, 'Prénom requis').min(2, 'Au moins 2 caractères'),
  date_naissance: z.string().min(1, 'Date de naissance requise'),
  cin: z.string(),
  sexe: z.enum(['MASCULIN', 'FEMININ']),
  tel: zOptionalPatientTel,
  email: z.union([z.literal(''), z.string().email('Email invalide')]),
  adresse: z.string(),
  groupeSanguin: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'INCONNU']),
  taille: z.string(),
  poids: z.string(),
  allergies: z.string(),
  antecedents: z.string(),
  assuranceType: z.enum(
    ASSURANCE_TYPE_VALUES as unknown as [string, ...string[]]
  ),
  matriculeAssurance: z.string().max(200),
});

type FormValues = z.infer<typeof formSchema>;

const EMPTY_FORM: FormValues = {
  nom: '',
  prenom: '',
  date_naissance: '',
  cin: '',
  sexe: 'MASCULIN',
  tel: '',
  email: '',
  adresse: '',
  groupeSanguin: 'INCONNU',
  taille: '',
  poids: '',
  allergies: '',
  antecedents: '',
  assuranceType: 'AUCUNE',
  matriculeAssurance: '',
};

const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
  'INCONNU',
] as const;

function birthInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function mapGroupeSanguin(
  g: string | null | undefined
): (typeof BLOOD_GROUPS)[number] {
  if (!g) return 'INCONNU';
  return (BLOOD_GROUPS as readonly string[]).includes(g)
    ? (g as (typeof BLOOD_GROUPS)[number])
    : 'INCONNU';
}

function mapAssuranceType(
  raw: string | null | undefined
): FormValues['assuranceType'] {
  if (!raw) return 'AUCUNE';
  return (ASSURANCE_TYPE_VALUES as readonly string[]).includes(raw)
    ? (raw as FormValues['assuranceType'])
    : 'AUCUNE';
}

export type PatientForEdit = {
  id: string;
  nom: string;
  prenom: string;
  tel: string | null;
  date_naissance: string;
  email?: string | null;
  adresse?: string | null;
  cin?: string | null;
  sexe?: 'MASCULIN' | 'FEMININ' | null;
  groupeSanguin?: string | null;
  taille?: number | null;
  poids?: number | null;
  allergies?: string | null;
  antecedents?: string | null;
  assuranceType?: string | null;
  matriculeAssurance?: string | null;
};

function patientToFormValues(p: PatientForEdit): FormValues {
  return {
    nom: p.nom ?? '',
    prenom: p.prenom ?? '',
    date_naissance: birthInputValue(p.date_naissance),
    cin: p.cin ?? '',
    sexe: p.sexe === 'FEMININ' ? 'FEMININ' : 'MASCULIN',
    tel: p.tel ?? '',
    email: p.email ?? '',
    adresse: p.adresse ?? '',
    groupeSanguin: mapGroupeSanguin(p.groupeSanguin),
    taille: p.taille != null && Number.isFinite(p.taille) ? String(p.taille) : '',
    poids: p.poids != null && Number.isFinite(p.poids) ? String(p.poids) : '',
    allergies: p.allergies ?? '',
    antecedents: p.antecedents ?? '',
    assuranceType: mapAssuranceType(p.assuranceType ?? undefined),
    matriculeAssurance: p.matriculeAssurance ?? '',
  };
}

function toastMessageFromErrorResponse(rawText: string, status: number): string {
  const trimmed = rawText.trim();
  if (!trimmed) return `Erreur HTTP ${status}`;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof parsed.error === 'string') return parsed.error;
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    /* brut */
  }
  return trimmed;
}

export type EditPatientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientForEdit | null;
  onSuccess?: () => void;
};

export function EditPatientModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: EditPatientModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: patient ? patientToFormValues(patient) : EMPTY_FORM,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const sexe = watch('sexe');
  const groupeSanguin = watch('groupeSanguin');

  useEffect(() => {
    if (open && patient) {
      reset(patientToFormValues(patient));
    }
  }, [open, patient?.id, reset, patient]);

  const onSubmit = async (values: FormValues) => {
    if (!patient) return;

    const sexeUpper = String(values.sexe).trim().toUpperCase();
    if (sexeUpper !== 'MASCULIN' && sexeUpper !== 'FEMININ') {
      toast.error('Sexe invalide.');
      return;
    }

    const tailleNorm = values.taille.trim().replace(/,/g, '.');
    const poidsNorm = values.poids.trim().replace(/,/g, '.');

    let taille: number | undefined;
    if (tailleNorm !== '') {
      const n = parseFloat(tailleNorm);
      taille = Number.isFinite(n) ? n : undefined;
    }

    let poids: number | undefined;
    if (poidsNorm !== '') {
      const n = parseFloat(poidsNorm);
      poids = Number.isFinite(n) ? n : undefined;
    }

    const dateNaissanceIso = new Date(values.date_naissance).toISOString();
    const emailTrim = values.email.trim();
    const adresseTrim = values.adresse.trim();
    const allergiesTrim = values.allergies.trim();
    const antecedentsTrim = values.antecedents.trim();
    const cinTrim = values.cin.trim();

    const body: Record<string, unknown> = {
      nom: values.nom.trim(),
      prenom: values.prenom.trim(),
      date_naissance: dateNaissanceIso,
      tel: (values.tel ?? '').trim(),
      sexe: sexeUpper,
      email: emailTrim === '' ? '' : emailTrim,
      adresse: adresseTrim === '' ? '' : adresseTrim,
      allergies: allergiesTrim === '' ? '' : allergiesTrim,
      antecedents: antecedentsTrim === '' ? '' : antecedentsTrim,
      groupeSanguin:
        values.groupeSanguin === 'INCONNU' ? '' : values.groupeSanguin,
      taille: taille ?? null,
      poids: poids ?? null,
    };
    if (cinTrim !== '') {
      body.cin = cinTrim;
    } else {
      body.cin = '';
    }

    const matriculeTrim = values.matriculeAssurance.trim();
    body.assuranceType = values.assuranceType;
    body.matriculeAssurance = matriculeTrim === '' ? '' : matriculeTrim;

    try {
      const res = await fetch(`/api/patients/${patient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const rawText = await res.text();

      if (!res.ok) {
        const msg = toastMessageFromErrorResponse(rawText, res.status);
        toast.error(
          rawText.trim() !== '' ? `[${res.status}] ${msg}` : `Erreur ${res.status}`
        );
        return;
      }

      toast.success('Patient mis à jour');
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      console.error('[EditPatientModal]', e);
      toast.error(
        e instanceof Error ? e.message : 'Erreur lors de la mise à jour'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier le dossier patient</DialogTitle>
          <DialogDescription>
            Tous les champs du dossier — alignés sur la création.
          </DialogDescription>
        </DialogHeader>

        {patient && (
          <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ep-nom">Nom *</Label>
                <Controller
                  name="nom"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="ep-nom"
                      className="uppercase"
                      autoComplete="family-name"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
                {errors.nom && (
                  <p className="text-sm text-red-600">{errors.nom.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-prenom">Prénom *</Label>
                <Controller
                  name="prenom"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="ep-prenom"
                      autoComplete="given-name"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
                {errors.prenom && (
                  <p className="text-sm text-red-600">{errors.prenom.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ep-dob">Date de naissance *</Label>
                <Controller
                  name="date_naissance"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="ep-dob"
                      type="date"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
                {errors.date_naissance && (
                  <p className="text-sm text-red-600">
                    {errors.date_naissance.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-cin">CIN</Label>
                <Controller
                  name="cin"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="ep-cin"
                      placeholder="AB123456"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Sexe *</Label>
                <Select
                  value={sexe ?? 'MASCULIN'}
                  onValueChange={(v) =>
                    setValue('sexe', v as 'MASCULIN' | 'FEMININ', {
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger id="ep-sexe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASCULIN">Masculin</SelectItem>
                    <SelectItem value="FEMININ">Féminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ep-tel">Téléphone</Label>
                <Controller
                  name="tel"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="ep-tel"
                      type="tel"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
                {errors.tel && (
                  <p className="text-sm text-red-600">{errors.tel.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-email">Email</Label>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="ep-email"
                      type="email"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      ref={field.ref}
                    />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-adr">Adresse</Label>
              <Controller
                name="adresse"
                control={control}
                render={({ field }) => (
                  <Input
                    id="ep-adr"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Groupe sanguin</Label>
                <Select
                  value={groupeSanguin ?? 'INCONNU'}
                  onValueChange={(v) =>
                    setValue(
                      'groupeSanguin',
                      v as FormValues['groupeSanguin'],
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger id="ep-groupe">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                      (g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      )
                    )}
                    <SelectItem value="INCONNU">Inconnu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-taille">Taille (cm)</Label>
                <div className="relative">
                  <Controller
                    name="taille"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="ep-taille"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        className="pr-10"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                    cm
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-poids">Poids (kg)</Label>
                <div className="relative">
                  <Controller
                    name="poids"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="ep-poids"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        className="pr-10"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
                    kg
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ep-all">Allergies</Label>
              <Controller
                name="allergies"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="ep-all"
                    rows={3}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-ant">Antécédents</Label>
              <Controller
                name="antecedents"
                control={control}
                render={({ field }) => (
                  <Textarea
                    id="ep-ant"
                    rows={3}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            </div>

            <PatientAssuranceFormSection />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default EditPatientModal;
