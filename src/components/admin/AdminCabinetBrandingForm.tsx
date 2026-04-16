'use client';

import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { ImagePlus, Loader2, Mail, Plus, Trash2 } from 'lucide-react';

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
import { PUBLIC_CABINET_SWR_KEY, openingHoursFromDb } from '@/lib/cabinet-branding';

const hourRow = z.object({
  jour: z.string().min(1, 'Libellé requis').max(80),
  plage: z.string().min(1, 'Plage requise').max(80),
});

const brandingSchema = z.object({
  cabinetName: z.string().max(120),
  doctorDisplayName: z.string().max(200),
  logoUrl: z.string().max(2048),
  cabinetPhone: z.string().max(60),
  cabinetEmail: z.union([z.literal(''), z.string().email('Email invalide')]),
  cabinetAddress: z.string().max(500),
  cabinetCityLine: z.string().max(200),
  doctorInpe: z.string().max(80),
  doctorSpecialty: z.string().max(200),
  mapEmbedUrl: z.string().max(4096),
  openingHours: z.array(hourRow).min(1, 'Au moins une ligne').max(14),
  smtpHost: z.string().max(255),
  smtpPort: z.string().max(10),
  smtpUser: z.string().max(255),
  smtpPass: z.string().max(500),
  smtpFrom: z.string().max(255),
});

export type BrandingInitial = {
  cabinetName: string | null;
  doctorDisplayName: string | null;
  logoUrl: string | null;
  cabinetPhone: string | null;
  cabinetEmail: string | null;
  cabinetAddress: string | null;
  cabinetCityLine: string | null;
  doctorInpe: string | null;
  doctorSpecialty: string | null;
  mapEmbedUrl: string | null;
  openingHours: unknown;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpFrom: string | null;
  smtpPasswordSet: boolean;
};

type BrandingFormValues = z.infer<typeof brandingSchema>;

const ADMIN_SETTINGS_KEY = '/api/admin/settings';

const bentoCard =
  'rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical';

function toFormValues(initial: BrandingInitial): BrandingFormValues {
  return {
    cabinetName: initial.cabinetName ?? '',
    doctorDisplayName: initial.doctorDisplayName ?? '',
    logoUrl: initial.logoUrl ?? '',
    cabinetPhone: initial.cabinetPhone ?? '',
    cabinetEmail: initial.cabinetEmail ?? '',
    cabinetAddress: initial.cabinetAddress ?? '',
    cabinetCityLine: initial.cabinetCityLine ?? '',
    doctorInpe: initial.doctorInpe ?? '',
    doctorSpecialty: initial.doctorSpecialty ?? '',
    mapEmbedUrl: initial.mapEmbedUrl ?? '',
    openingHours: openingHoursFromDb(initial.openingHours),
    smtpHost: initial.smtpHost ?? '',
    smtpPort: initial.smtpPort != null ? String(initial.smtpPort) : '',
    smtpUser: initial.smtpUser ?? '',
    smtpPass: '',
    smtpFrom: initial.smtpFrom ?? '',
  };
}

type Props = {
  initial: BrandingInitial | null;
  loading: boolean;
  /** Rafraîchit l’état parent (ex. snapshot GET /api/admin/settings). */
  onSaved?: () => void | Promise<void>;
};

export function AdminCabinetBrandingForm({ initial, loading, onSaved }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [smtpPasswordHint, setSmtpPasswordHint] = useState(false);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: initial ? toFormValues(initial) : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'openingHours',
  });

  useEffect(() => {
    if (initial) {
      form.reset(toFormValues(initial));
      setSmtpPasswordHint(initial.smtpPasswordSet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- appliquer le snapshot serveur au chargement
  }, [initial]);

  const logoUrlWatch = form.watch('logoUrl');

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/settings/logo', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Envoi du logo impossible');
        return;
      }
      if (typeof data.logoUrl === 'string') {
        form.setValue('logoUrl', data.logoUrl, { shouldDirty: true, shouldValidate: true });
        toast.success('Logo importé — enregistrez pour appliquer partout');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.smtpPort.trim() !== '') {
      const pn = Number.parseInt(values.smtpPort.trim(), 10);
      if (!Number.isFinite(pn) || pn < 1 || pn > 65535) {
        toast.error('Port SMTP invalide (1–65535)');
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch(ADMIN_SETTINGS_KEY, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          cabinetName: values.cabinetName.trim() || null,
          doctorDisplayName: values.doctorDisplayName.trim() || null,
          logoUrl: values.logoUrl.trim() || null,
          cabinetPhone: values.cabinetPhone.trim() || null,
          cabinetEmail: values.cabinetEmail.trim() || null,
          cabinetAddress: values.cabinetAddress.trim() || null,
          cabinetCityLine: values.cabinetCityLine.trim() || null,
          doctorInpe: values.doctorInpe.trim() || null,
          doctorSpecialty: values.doctorSpecialty.trim() || null,
          mapEmbedUrl: values.mapEmbedUrl.trim() || null,
          openingHours: values.openingHours,
          smtpHost: values.smtpHost.trim() || null,
          smtpPort:
            values.smtpPort.trim() === ''
              ? null
              : Number.parseInt(values.smtpPort.trim(), 10),
          smtpUser: values.smtpUser.trim() || null,
          smtpFrom: values.smtpFrom.trim() || null,
          ...(values.smtpPass.trim() !== '' ? { smtpPass: values.smtpPass } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Enregistrement impossible');
        return;
      }
      toast.success('Identité cabinet enregistrée');
      await mutate(PUBLIC_CABINET_SWR_KEY);
      await mutate(ADMIN_SETTINGS_KEY);
      await onSaved?.();
      form.reset(
        toFormValues({
          cabinetName: data.cabinetName ?? null,
          doctorDisplayName: data.doctorDisplayName ?? null,
          logoUrl: data.logoUrl ?? null,
          cabinetPhone: data.cabinetPhone ?? null,
          cabinetEmail: data.cabinetEmail ?? null,
          cabinetAddress: data.cabinetAddress ?? null,
          cabinetCityLine: data.cabinetCityLine ?? null,
          doctorInpe: data.doctorInpe ?? null,
          doctorSpecialty: data.doctorSpecialty ?? null,
          mapEmbedUrl: data.mapEmbedUrl ?? null,
          openingHours: data.openingHours,
          smtpHost: data.smtpHost ?? null,
          smtpPort: data.smtpPort ?? null,
          smtpUser: data.smtpUser ?? null,
          smtpFrom: data.smtpFrom ?? null,
          smtpPasswordSet: Boolean(data.smtpPasswordSet),
        })
      );
      setSmtpPasswordHint(Boolean(data.smtpPasswordSet));
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  });

  if (loading || !initial) {
    return (
      <div className={`${bentoCard} col-span-full`}>
        <p className="text-sm text-on-surface-variant">Chargement de l’identité cabinet…</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:grid-rows-[auto_auto]">
          {/* Logo */}
          <div className={`${bentoCard} flex flex-col lg:row-span-2`}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Logo
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              PNG, JPEG ou WebP — max 2 Mo. Affiché dans la barre latérale et l’en-tête du site.
            </p>
            <div className="mt-5 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/25 bg-surface px-4 py-8">
              {logoUrlWatch ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrlWatch}
                  alt=""
                  className="max-h-32 max-w-full object-contain"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ImagePlus className="h-10 w-10 opacity-70" aria-hidden />
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPickLogo}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                className="bg-container-high/90 text-on-surface"
                disabled={uploadingLogo}
                onClick={() => fileRef.current?.click()}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi…
                  </>
                ) : (
                  'Choisir une image'
                )}
              </Button>
              {logoUrlWatch ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-on-surface-variant"
                  onClick={() => form.setValue('logoUrl', '', { shouldDirty: true })}
                >
                  Retirer l’aperçu
                </Button>
              ) : null}
            </div>
            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel className="text-on-surface-variant">URL du logo (optionnel)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="/uploads/cabinet/… ou https://…"
                      className="border-outline-variant/20 bg-surface"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Identité */}
          <div className={bentoCard}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Identité
            </h3>
            <div className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="cabinetName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du cabinet</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} className="border-outline-variant/20 bg-surface" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doctorDisplayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom affiché du praticien</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} className="border-outline-variant/20 bg-surface" />
                    </FormControl>
                    <p className="text-xs text-on-surface-variant">
                      Utilisé sur les ordonnances PDF (signature « Dr. … »).
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doctorSpecialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spécialité</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="ex. Médecine générale, Cardiologie…"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="doctorInpe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>INPE</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Numéro d’inscription professionnelle"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contact */}
          <div className={bentoCard}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Contact
            </h3>
            <div className="mt-4 space-y-4">
              <FormField
                control={form.control}
                name="cabinetPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} className="border-outline-variant/20 bg-surface" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cabinetEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email cabinet</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type="email"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cabinetAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ''}
                        rows={2}
                        className="resize-none border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <p className="text-xs text-on-surface-variant">
                      Affichée sur les en-têtes PDF avec la ligne ville / région ci-dessous.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cabinetCityLine"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville / région</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="ex. Casablanca, Maroc"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Carte */}
          <div className={`${bentoCard} lg:col-span-2`}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Carte (iframe Google Maps)
            </h3>
            <p className="mt-1 text-xs text-on-surface-variant">
              Google Maps → Partager → Intégrer une carte → copiez uniquement la valeur de <code className="rounded bg-container-high px-1">src</code> de la balise iframe.
            </p>
            <FormField
              control={form.control}
              name="mapEmbedUrl"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>URL d’intégration</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={3}
                      placeholder="https://www.google.com/maps/embed?pb=…"
                      className="resize-y border-outline-variant/20 bg-surface font-mono text-xs"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Horaires */}
          <div className={`${bentoCard} lg:col-span-3`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                Horaires d’ouverture
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-outline-variant/20"
                onClick={() => append({ jour: '', plage: '' })}
              >
                <Plus className="mr-1 h-4 w-4" />
                Ligne
              </Button>
            </div>
            <div className="mt-4 space-y-3">
              {fields.map((f, index) => (
                <div key={f.id} className="flex flex-col gap-2 rounded-lg border border-outline-variant/10 bg-surface p-3 sm:flex-row sm:items-end">
                  <FormField
                    control={form.control}
                    name={`openingHours.${index}.jour`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Jour</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} className="border-outline-variant/20 bg-container-lowest" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`openingHours.${index}.plage`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Plage</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} className="border-outline-variant/20 bg-container-lowest" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-on-surface-variant hover:text-destructive"
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                    aria-label="Supprimer la ligne"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SMTP */}
          <div className={`${bentoCard} lg:col-span-3`}>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Mail className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
                  Configuration serveur email (SMTP)
                </h3>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Utilisé pour les emails transactionnels (ex. réinitialisation de mot de passe). Laissez le mot de passe vide pour conserver le secret actuel.
                  {smtpPasswordHint ? (
                    <span className="mt-1 block font-medium text-on-surface">
                      Un mot de passe est déjà enregistré.
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="smtpHost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hôte SMTP</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="smtp.example.com"
                        autoComplete="off"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Port</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="587"
                        inputMode="numeric"
                        autoComplete="off"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Utilisateur</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        autoComplete="off"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        type="password"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpFrom"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Adresse d&apos;expédition (From)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="noreply@votre-domaine.ma"
                        autoComplete="off"
                        className="border-outline-variant/20 bg-surface"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="bg-gradient-to-b from-blue-500 to-blue-600 shadow-medical"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer l’identité cabinet'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
