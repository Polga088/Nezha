'use client';

import { useForm } from 'react-hook-form';
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
import { PatientAssuranceFormSection } from '@/components/patients/PatientForm';
import { ASSURANCE_TYPE_VALUES } from '@/lib/assurance-types';
import { zOptionalPatientTel } from '@/lib/patient-fields';
import { cn } from '@/lib/utils';

/** Route Handler Next.js (même origine, ex. port 3001) */
const PATIENTS_CREATE_URL = '/api/patients';

/**
 * Payload POST — clés = noms Prisma (`Patient` dans schema.prisma).
 * `cin` : optionnel (comme en DB) ; omis du JSON si vide.
 */
export type PatientCreatePayload = {
  nom: string;
  prenom: string;
  date_naissance: string;
  /** Omis ou chaîne vide si aucun numéro */
  tel?: string;
  sexe: 'MASCULIN' | 'FEMININ';
  cin?: string;
  email?: string;
  adresse?: string;
  groupeSanguin?: string;
  taille?: number;
  poids?: number;
  allergies?: string;
  antecedents?: string;
  assuranceType?: string;
  matriculeAssurance?: string;
};

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

const DEFAULTS: FormValues = {
  nom: '',
  prenom: '',
  date_naissance: '',
  cin: '',
  sexe: 'MASCULIN',
  tel: '',
  email: '',
  adresse: '',
  groupeSanguin: 'A+',
  taille: '',
  poids: '',
  allergies: '',
  antecedents: '',
  assuranceType: 'AUCUNE',
  matriculeAssurance: '',
};

/** Nest ValidationPipe : `message` peut être une string ou un tableau de strings */
function formatNestMessageField(message: unknown): string | null {
  if (typeof message === 'string' && message.trim() !== '') return message;
  if (Array.isArray(message) && message.every((m) => typeof m === 'string'))
    return message.join(' ');
  return null;
}

/** Lit le corps brut, tente JSON.parse, extrait message / error (NestJS) */
function toastMessageFromErrorResponse(rawText: string, status: number): string {
  const trimmed = rawText.trim();
  if (!trimmed) return `Erreur HTTP ${status}`;

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && parsed !== null) {
      const o = parsed as Record<string, unknown>;
      const fromMessage = formatNestMessageField(o.message);
      if (fromMessage) return fromMessage;
      if (typeof o.error === 'string' && o.error.trim() !== '') return o.error;
    }
  } catch {
    /* pas du JSON : on renvoie le brut */
  }

  return trimmed;
}

/** Avec register(), ne pas fournir `value` — voir EditPatientModal / UnitInput. */
function UnitInput({
  unit,
  className,
  value: controlledValue,
  id,
  ...props
}: React.ComponentProps<typeof Input> & { unit: string }) {
  return (
    <div className="relative">
      <Input
        id={id}
        {...props}
        className={cn('pr-10', className)}
        {...(controlledValue !== undefined
          ? {
              value:
                controlledValue === null || controlledValue === ''
                  ? ''
                  : String(controlledValue),
            }
          : {})}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
        {unit}
      </span>
    </div>
  );
}

export type CreatePatientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé après création 201 */
  onSuccess?: () => void;
};

export function CreatePatientModal({
  open,
  onOpenChange,
  onSuccess,
}: CreatePatientModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const sexe = watch('sexe');
  const groupeSanguin = watch('groupeSanguin');

  const onSubmit = async (values: FormValues) => {
    const sexeUpper = String(values.sexe).trim().toUpperCase();
    if (sexeUpper !== 'MASCULIN' && sexeUpper !== 'FEMININ') {
      toast.error('Sexe invalide — MASCULIN ou FEMININ uniquement.');
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

    const matriculeAssuranceTrim = values.matriculeAssurance.trim();

    const telTrim = (values.tel ?? '').trim();
    const payload: PatientCreatePayload = {
      nom: values.nom.trim(),
      prenom: values.prenom.trim(),
      date_naissance: dateNaissanceIso,
      ...(telTrim !== '' ? { tel: telTrim } : {}),
      sexe: sexeUpper as 'MASCULIN' | 'FEMININ',
      email: emailTrim === '' ? undefined : emailTrim,
      adresse: adresseTrim === '' ? undefined : adresseTrim,
      groupeSanguin:
        values.groupeSanguin === 'INCONNU' ? undefined : values.groupeSanguin,
      taille,
      poids,
      allergies: allergiesTrim === '' ? undefined : allergiesTrim,
      antecedents: antecedentsTrim === '' ? undefined : antecedentsTrim,
      assuranceType: values.assuranceType,
      ...(matriculeAssuranceTrim !== ''
        ? { matriculeAssurance: matriculeAssuranceTrim }
        : {}),
    };
    if (cinTrim !== '') {
      payload.cin = cinTrim;
    }

    console.log("Tentative d'envoi vers /api/patients");

    try {
      const res = await fetch(PATIENTS_CREATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();

      if (!res.ok) {
        const hint =
          res.status === 404
            ? ' (route introuvable — vérifiez src/app/api/patients/route.ts)'
            : res.status >= 500
              ? ' (erreur serveur — souvent Prisma ou base de données)'
              : '';

        console.error('[CreatePatientModal] HTTP', res.status, res.statusText, hint);
        console.error('[CreatePatientModal] corps erreur (brut)', rawText);

        let parsedForLog: unknown = null;
        try {
          parsedForLog = rawText ? JSON.parse(rawText) : null;
        } catch {
          parsedForLog = null;
        }
        if (parsedForLog !== null) {
          console.error('[CreatePatientModal] corps erreur (JSON)', parsedForLog);
        }

        const parsedMsg = toastMessageFromErrorResponse(rawText, res.status);
        const display =
          rawText.trim() !== ''
            ? `[${res.status}] ${parsedMsg}`
            : `[${res.status}] ${res.statusText || 'Réponse vide'}${hint}`;

        toast.error(display);
        return;
      }

      toast.success(
        `Dossier de ${values.prenom.trim()} ${values.nom.trim().toUpperCase()} créé`
      );
      reset(DEFAULTS);
      onOpenChange(false);
      onSuccess?.();
    } catch (e) {
      console.error('[CreatePatientModal] fetch échoué', e);
      toast.error(
        e instanceof Error
          ? `${e.name}: ${e.message}`
          : 'Échec réseau (Failed to fetch).'
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <Form {...form}>
          <DialogHeader>
            <DialogTitle>Nouveau dossier patient</DialogTitle>
            <DialogDescription>
              Les champs marqués d&apos;un astérisque sont obligatoires.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cp-nom">Nom *</Label>
              <Input
                id="cp-nom"
                {...register('nom')}
                className="uppercase"
                autoComplete="family-name"
              />
              {errors.nom && (
                <p className="text-sm text-red-600">{errors.nom.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-prenom">Prénom *</Label>
              <Input
                id="cp-prenom"
                {...register('prenom')}
                autoComplete="given-name"
              />
              {errors.prenom && (
                <p className="text-sm text-red-600">{errors.prenom.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cp-dob">Date de naissance *</Label>
              <Input id="cp-dob" type="date" {...register('date_naissance')} />
              {errors.date_naissance && (
                <p className="text-sm text-red-600">
                  {errors.date_naissance.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-cin">CIN</Label>
              <Input id="cp-cin" {...register('cin')} placeholder="AB123456" />
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
                <SelectTrigger>
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
              <Label htmlFor="cp-tel">Téléphone</Label>
              <Input id="cp-tel" type="tel" {...register('tel')} />
              {errors.tel && (
                <p className="text-sm text-red-600">{errors.tel.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-email">Email</Label>
              <Input id="cp-email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-adr">Adresse</Label>
            <Input id="cp-adr" {...register('adresse')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Groupe sanguin</Label>
              <Select
                value={groupeSanguin ?? 'A+'}
                onValueChange={(v) =>
                  setValue(
                    'groupeSanguin',
                    v as FormValues['groupeSanguin'],
                    { shouldValidate: true }
                  )
                }
              >
                <SelectTrigger>
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
              <Label htmlFor="cp-taille">Taille (cm)</Label>
              <UnitInput
                id="cp-taille"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                unit="cm"
                {...register('taille')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-poids">Poids (kg)</Label>
              <UnitInput
                id="cp-poids"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                unit="kg"
                {...register('poids')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-all">Allergies</Label>
            <Textarea id="cp-all" {...register('allergies')} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-ant">Antécédents</Label>
            <Textarea id="cp-ant" {...register('antecedents')} rows={3} />
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
              {isSubmitting ? 'Enregistrement...' : 'Créer le dossier'}
            </Button>
          </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CreatePatientModal;
