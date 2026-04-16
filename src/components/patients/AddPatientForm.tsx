'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User, Activity, MapPin, Stethoscope } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ASSURANCE_TYPE_VALUES } from '@/lib/assurance-types';
import { zOptionalPatientTel } from '@/lib/patient-fields';
import { PatientAssuranceFormSection } from '@/components/patients/PatientForm';

// ─── Schéma Zod ─────────────────────────────────────────────────────────────
const patientSchema = z.object({
  // Identité
  nom: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  date_naissance: z.string().min(1, 'La date de naissance est requise'),
  cin: z.string(),
  sexe: z.enum(['MASCULIN', 'FEMININ']),

  // Contact
  tel: zOptionalPatientTel,
  email: z.union([z.literal(''), z.string().email('Email invalide')]),
  adresse: z.string(),

  assuranceType: z.enum(
    ASSURANCE_TYPE_VALUES as unknown as [string, ...string[]]
  ),
  matriculeAssurance: z.string().max(200),

  // Informations médicales
  groupeSanguin: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'INCONNU']),
  taille: z.string(),
  poids: z.string(),
  allergies: z.string(),
  antecedents: z.string(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const DEFAULT_PATIENT_VALUES: PatientFormValues = {
  nom: '',
  prenom: '',
  date_naissance: '',
  cin: '',
  sexe: 'MASCULIN',
  tel: '',
  email: '',
  adresse: '',
  assuranceType: 'AUCUNE',
  matriculeAssurance: '',
  groupeSanguin: 'A+',
  taille: '',
  poids: '',
  allergies: '',
  antecedents: '',
};


// ─── Props ───────────────────────────────────────────────────────────────────
interface AddPatientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionTitle({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="p-1.5 bg-blue-50 rounded-md text-blue-600">
        <Icon size={15} />
      </div>
      <span className="text-sm font-semibold text-slate-700 tracking-wide uppercase">
        {label}
      </span>
    </div>
  );
}

function UnitInput({
  unit,
  className,
  value,
  ...props
}: React.ComponentProps<typeof Input> & { unit: string }) {
  const safe = value === undefined || value === null ? '' : String(value);
  return (
    <div className="relative">
      <Input {...props} value={safe} className={cn('pr-10', className)} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
        {unit}
      </span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function AddPatientForm({ onSuccess, onCancel }: AddPatientFormProps) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: DEFAULT_PATIENT_VALUES,
  });

  const onSubmit = async (values: PatientFormValues) => {
    try {
      const tailleStr = String(values.taille ?? '').trim();
      const poidsStr = String(values.poids ?? '').trim();
      const taille =
        tailleStr === '' ? undefined : parseFloat(tailleStr.replace(',', '.'));
      const poids =
        poidsStr === '' ? undefined : parseFloat(poidsStr.replace(',', '.'));

      const matriculeTrim = String(values.matriculeAssurance ?? '').trim();

      const payload = {
        ...values,
        matriculeAssurance: matriculeTrim === '' ? undefined : matriculeTrim,
        taille:
          taille !== undefined && Number.isFinite(taille) ? taille : undefined,
        poids:
          poids !== undefined && Number.isFinite(poids) ? poids : undefined,
      };

      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide — vérifiez `npx prisma generate`');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Erreur de création');

      toast.success(`Dossier de ${values.prenom} ${values.nom.toUpperCase()} créé avec succès`);
      form.reset(DEFAULT_PATIENT_VALUES);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur de base de données');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

        {/* ── SECTION 1 : Identité ──────────────────────────────────────── */}
        <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-4">
          <SectionTitle icon={User} label="Identité du Patient" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de famille <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DUPONT"
                      className="uppercase placeholder:normal-case"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Jean" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="date_naissance"
              render={({ field }) => (
                <FormItem className="sm:col-span-1">
                  <FormLabel>Date de naissance <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIN / N° Identité</FormLabel>
                  <FormControl>
                    <Input placeholder="AB123456" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sexe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexe</FormLabel>
                  <Select
                    value={field.value ?? 'MASCULIN'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MASCULIN">Masculin</SelectItem>
                      <SelectItem value="FEMININ">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── SECTION 2 : Contact ───────────────────────────────────────── */}
        <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-4">
          <SectionTitle icon={MapPin} label="Coordonnées" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder="06 00 00 00 00"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jean@email.com"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="adresse"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adresse</FormLabel>
                <FormControl>
                  <Input
                    placeholder="12 rue de la Paix, Casablanca"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── SECTION 3 : Informations médicales ───────────────────────── */}
        <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-4">
          <SectionTitle icon={Activity} label="Informations Médicales" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="groupeSanguin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Groupe Sanguin</FormLabel>
                  <Select
                    value={field.value ?? 'A+'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Inconnu" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                      <SelectItem value="INCONNU">Inconnu</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taille"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taille</FormLabel>
                  <FormControl>
                    <UnitInput
                      type="number"
                      placeholder="175"
                      min={30}
                      max={250}
                      unit="cm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poids</FormLabel>
                  <FormControl>
                    <UnitInput
                      type="number"
                      placeholder="70"
                      min={1}
                      max={500}
                      unit="kg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* ── SECTION 4 : Historique médical ───────────────────────────── */}
        <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-4">
          <SectionTitle icon={Stethoscope} label="Historique Médical" />

          <FormField
            control={form.control}
            name="allergies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allergies connues</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex : Pénicilline, Arachides, Pollen…"
                    className="min-h-[80px] resize-none bg-white"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="antecedents"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Antécédents médicaux & chirurgicaux</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Ex : Diabète type 2, Appendicectomie (2018), Hypertension…"
                    className="min-h-[100px] resize-none bg-white"
                    {...field}
                    value={field.value ?? ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ── Couverture sociale (Prisma: assuranceType, matriculeAssurance) — juste après antécédents ─ */}
        <PatientAssuranceFormSection />

        {/* ── ACTIONS ──────────────────────────────────────────────────── */}
        <Separator />
        <div className="flex justify-end gap-3 pt-1">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-sm min-w-[140px]"
          >
            {form.formState.isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Enregistrement…
              </span>
            ) : (
              'Créer le Dossier'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
