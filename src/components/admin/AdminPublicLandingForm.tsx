'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2, UploadCloud } from 'lucide-react';

import {
  PUBLIC_HERO_BACKGROUND_COLORS,
  PUBLIC_HERO_BACKGROUND_DIRECTIONS,
  PUBLIC_HERO_BACKGROUND_MODES,
  type PublicCabinetBranding,
  type PublicHeroBackgroundColor,
  type PublicHeroBackgroundDirection,
  type PublicHeroBackgroundMode,
  type PublicHeroSlideRow,
} from '@/lib/cabinet-branding';
import { PublicHeroBackground } from '@/components/landing/PublicHeroBackground';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PUBLIC_SETTINGS_KEY = '/api/admin/settings';

type PublicLandingInitial = Pick<
  PublicCabinetBranding,
  | 'publicSiteName'
  | 'publicDoctorDisplayName'
  | 'publicSpecialty'
  | 'publicHeroEyebrow'
  | 'publicHeroTitle'
  | 'publicHeroDescription'
  | 'publicPrimaryButtonLabel'
  | 'publicSecondaryButtonLabel'
  | 'publicFeature1Title'
  | 'publicFeature1Description'
  | 'publicFeature2Title'
  | 'publicFeature2Description'
  | 'publicFeature3Title'
  | 'publicFeature3Description'
  | 'publicMetaTitle'
  | 'publicMetaDescription'
  | 'publicHeroBackgroundMode'
  | 'publicHeroBackgroundGradientFrom'
  | 'publicHeroBackgroundGradientTo'
  | 'publicHeroBackgroundGradientDirection'
  | 'publicHeroBackgroundImageUrl'
  | 'publicHeroBackgroundOverlay'
  | 'publicHeroBackgroundSliderIntervalMs'
  | 'publicHeroSlides'
>;

type Props = {
  initial: PublicLandingInitial | null;
  loading: boolean;
  onSaved?: () => void | Promise<void>;
};

type FormState = {
  publicSiteName: string;
  publicDoctorDisplayName: string;
  publicSpecialty: string;
  publicHeroEyebrow: string;
  publicHeroTitle: string;
  publicHeroDescription: string;
  publicPrimaryButtonLabel: string;
  publicSecondaryButtonLabel: string;
  publicFeature1Title: string;
  publicFeature1Description: string;
  publicFeature2Title: string;
  publicFeature2Description: string;
  publicFeature3Title: string;
  publicFeature3Description: string;
  publicMetaTitle: string;
  publicMetaDescription: string;
  publicHeroBackgroundMode: PublicHeroBackgroundMode;
  publicHeroBackgroundGradientFrom: PublicHeroBackgroundColor;
  publicHeroBackgroundGradientTo: PublicHeroBackgroundColor;
  publicHeroBackgroundGradientDirection: PublicHeroBackgroundDirection;
  publicHeroBackgroundImageUrl: string;
  publicHeroBackgroundOverlay: string;
  publicHeroBackgroundSliderIntervalMs: string;
};

type SlideState = PublicHeroSlideRow;

const slideCard = 'rounded-xl border border-outline-variant/15 bg-container-lowest p-4 shadow-medical';

function normalizeInitial(initial: PublicLandingInitial): FormState {
  return {
    publicSiteName: initial.publicSiteName ?? '',
    publicDoctorDisplayName: initial.publicDoctorDisplayName ?? '',
    publicSpecialty: initial.publicSpecialty ?? '',
    publicHeroEyebrow: initial.publicHeroEyebrow ?? '',
    publicHeroTitle: initial.publicHeroTitle ?? '',
    publicHeroDescription: initial.publicHeroDescription ?? '',
    publicPrimaryButtonLabel: initial.publicPrimaryButtonLabel ?? '',
    publicSecondaryButtonLabel: initial.publicSecondaryButtonLabel ?? '',
    publicFeature1Title: initial.publicFeature1Title ?? '',
    publicFeature1Description: initial.publicFeature1Description ?? '',
    publicFeature2Title: initial.publicFeature2Title ?? '',
    publicFeature2Description: initial.publicFeature2Description ?? '',
    publicFeature3Title: initial.publicFeature3Title ?? '',
    publicFeature3Description: initial.publicFeature3Description ?? '',
    publicMetaTitle: initial.publicMetaTitle ?? '',
    publicMetaDescription: initial.publicMetaDescription ?? '',
    publicHeroBackgroundMode: initial.publicHeroBackgroundMode ?? 'GRADIENT',
    publicHeroBackgroundGradientFrom: initial.publicHeroBackgroundGradientFrom ?? 'blue-600',
    publicHeroBackgroundGradientTo: initial.publicHeroBackgroundGradientTo ?? 'indigo-600',
    publicHeroBackgroundGradientDirection: initial.publicHeroBackgroundGradientDirection ?? 'to-br',
    publicHeroBackgroundImageUrl: initial.publicHeroBackgroundImageUrl ?? '',
    publicHeroBackgroundOverlay: String(initial.publicHeroBackgroundOverlay ?? 0.35),
    publicHeroBackgroundSliderIntervalMs: String(initial.publicHeroBackgroundSliderIntervalMs ?? 7000),
  };
}

function parseOverlay(value: string) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(Math.max(numeric, 0), 1);
}

function parseSliderInterval(value: string) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(Math.max(numeric, 4000), 12000);
}

export function AdminPublicLandingForm({ initial, loading, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [state, setState] = useState<FormState | null>(null);
  const [slides, setSlides] = useState<SlideState[]>([]);

  useEffect(() => {
    if (!initial) return;
    setState(normalizeInitial(initial));
    setSlides([...(initial.publicHeroSlides ?? [])].sort((a, b) => a.position - b.position));
  }, [initial]);

  const previewPayload = useMemo(
    () =>
      state
        ? {
            cabinetName: state.publicSiteName || 'Nezha Medical',
            doctorDisplayName: state.publicDoctorDisplayName || 'Dr. EL MAAROUFI Nezha',
            publicSiteName: state.publicSiteName || 'Nezha Medical',
            publicDoctorDisplayName: state.publicDoctorDisplayName || 'Dr. EL MAAROUFI Nezha',
            publicSpecialty: state.publicSpecialty || 'Médecine générale',
            publicHeroEyebrow: state.publicHeroEyebrow || 'Soins & accompagnement',
            publicHeroTitle: state.publicHeroTitle || '',
            publicHeroDescription: state.publicHeroDescription || '',
            publicPrimaryButtonLabel: state.publicPrimaryButtonLabel || 'Saisir un code document',
            publicSecondaryButtonLabel: state.publicSecondaryButtonLabel || 'Adresse & horaires',
            publicFeature1Title: state.publicFeature1Title || 'Données protégées',
            publicFeature1Description:
              state.publicFeature1Description || "Accès aux documents après vérification d'identité.",
            publicFeature2Title: state.publicFeature2Title || 'Contact direct',
            publicFeature2Description: state.publicFeature2Description || 'Appelez-nous pour un rendez-vous ou une question.',
            publicFeature3Title: state.publicFeature3Title || 'À votre rythme',
            publicFeature3Description: state.publicFeature3Description || 'Toutes les infos utiles en bas de page.',
            publicHeroBackgroundMode: state.publicHeroBackgroundMode,
            publicHeroBackgroundGradientFrom: state.publicHeroBackgroundGradientFrom,
            publicHeroBackgroundGradientTo: state.publicHeroBackgroundGradientTo,
            publicHeroBackgroundGradientDirection: state.publicHeroBackgroundGradientDirection,
            publicHeroBackgroundImageUrl: state.publicHeroBackgroundImageUrl || null,
            publicHeroBackgroundOverlay: parseOverlay(state.publicHeroBackgroundOverlay) ?? 0.35,
            publicHeroBackgroundSliderIntervalMs: parseSliderInterval(state.publicHeroBackgroundSliderIntervalMs) ?? 7000,
            publicHeroSlides: slides,
            logoUrl: null,
            phone: '',
            email: '',
            address: '',
            cityLine: '',
            mapEmbedUrl: '',
            openingHours: [],
            publicMetaTitle: state.publicMetaTitle || 'Nezha Medical',
            publicMetaDescription: state.publicMetaDescription || '',
          }
        : null,
    [slides, state]
  );

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((current) => (current ? { ...current, [key]: value } : current));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    setSlides((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next.map((slide, position) => ({ ...slide, position }));
    });
  };

  const toggleSlide = (id: string) => {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, isActive: !slide.isActive } : slide))
    );
  };

  const removeSlide = async (id: string) => {
    const slide = slides.find((item) => item.id === id);
    if (!slide) return;
    if (!window.confirm('Supprimer cette image de fond ?')) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/admin/settings/public-background/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload?.error ?? 'Suppression impossible');
        return;
      }
      setSlides((current) => current.filter((item) => item.id !== id).map((item, position) => ({ ...item, position })));
      toast.success('Image supprimée');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setUploading(false);
    }
  };

  const uploadBackground = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/png,image/jpeg,image/webp';

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('mode', state?.publicHeroBackgroundMode === 'SLIDER' ? 'slide' : 'image');

        const response = await fetch('/api/admin/settings/public-background', {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          toast.error(payload?.error ?? 'Envoi impossible');
          return;
        }

        if (state?.publicHeroBackgroundMode === 'SLIDER' && payload?.slide?.id) {
          const slide: SlideState = payload.slide;
          setSlides((current) => [...current, slide].map((item, position) => ({ ...item, position })));
        } else if (typeof payload?.imageUrl === 'string') {
          if (state?.publicHeroBackgroundImageUrl) {
            await fetch(
              `/api/admin/settings/public-background/${encodeURIComponent(state.publicHeroBackgroundImageUrl)}`,
              { method: 'DELETE', credentials: 'same-origin' }
            ).catch(() => null);
          }
          updateField('publicHeroBackgroundImageUrl', payload.imageUrl);
        }
        toast.success('Image téléversée');
      } catch {
        toast.error('Erreur réseau');
      } finally {
        setUploading(false);
      }
    };

    fileInput.click();
  };

  const handleSave = async () => {
    if (!state) return;
    const overlay = parseOverlay(state.publicHeroBackgroundOverlay);
    const interval = parseSliderInterval(state.publicHeroBackgroundSliderIntervalMs);
    if (overlay === null) {
      toast.error('Overlay invalide');
      return;
    }
    if (interval === null) {
      toast.error('Durée du slider invalide');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(PUBLIC_SETTINGS_KEY, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          publicSiteName: state.publicSiteName.trim() || null,
          publicDoctorDisplayName: state.publicDoctorDisplayName.trim() || null,
          publicSpecialty: state.publicSpecialty.trim() || null,
          publicHeroEyebrow: state.publicHeroEyebrow.trim() || null,
          publicHeroTitle: state.publicHeroTitle.trim() || null,
          publicHeroDescription: state.publicHeroDescription.trim() || null,
          publicPrimaryButtonLabel: state.publicPrimaryButtonLabel.trim() || null,
          publicSecondaryButtonLabel: state.publicSecondaryButtonLabel.trim() || null,
          publicFeature1Title: state.publicFeature1Title.trim() || null,
          publicFeature1Description: state.publicFeature1Description.trim() || null,
          publicFeature2Title: state.publicFeature2Title.trim() || null,
          publicFeature2Description: state.publicFeature2Description.trim() || null,
          publicFeature3Title: state.publicFeature3Title.trim() || null,
          publicFeature3Description: state.publicFeature3Description.trim() || null,
          publicMetaTitle: state.publicMetaTitle.trim() || null,
          publicMetaDescription: state.publicMetaDescription.trim() || null,
          publicHeroBackgroundMode: state.publicHeroBackgroundMode,
          publicHeroBackgroundGradientFrom: state.publicHeroBackgroundGradientFrom,
          publicHeroBackgroundGradientTo: state.publicHeroBackgroundGradientTo,
          publicHeroBackgroundGradientDirection: state.publicHeroBackgroundGradientDirection,
          publicHeroBackgroundImageUrl: state.publicHeroBackgroundImageUrl.trim() || null,
          publicHeroBackgroundOverlay: overlay,
          publicHeroBackgroundSliderIntervalMs: interval,
          publicHeroSlides: slides.map((slide, position) => ({
            id: slide.id,
            altText: slide.altText ?? null,
            position,
            isActive: slide.isActive,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload?.error ?? 'Enregistrement impossible');
        return;
      }
      toast.success('Page publique enregistrée');
      await onSaved?.();
      if (Array.isArray(payload.publicHeroSlides)) {
        setSlides(payload.publicHeroSlides);
      }
      setState(normalizeInitial({
        publicSiteName: payload.publicSiteName ?? null,
        publicDoctorDisplayName: payload.publicDoctorDisplayName ?? null,
        publicSpecialty: payload.publicSpecialty ?? null,
        publicHeroEyebrow: payload.publicHeroEyebrow ?? null,
        publicHeroTitle: payload.publicHeroTitle ?? null,
        publicHeroDescription: payload.publicHeroDescription ?? null,
        publicPrimaryButtonLabel: payload.publicPrimaryButtonLabel ?? null,
        publicSecondaryButtonLabel: payload.publicSecondaryButtonLabel ?? null,
        publicFeature1Title: payload.publicFeature1Title ?? null,
        publicFeature1Description: payload.publicFeature1Description ?? null,
        publicFeature2Title: payload.publicFeature2Title ?? null,
        publicFeature2Description: payload.publicFeature2Description ?? null,
        publicFeature3Title: payload.publicFeature3Title ?? null,
        publicFeature3Description: payload.publicFeature3Description ?? null,
        publicMetaTitle: payload.publicMetaTitle ?? null,
        publicMetaDescription: payload.publicMetaDescription ?? null,
        publicHeroBackgroundMode: payload.publicHeroBackgroundMode ?? 'GRADIENT',
        publicHeroBackgroundGradientFrom: payload.publicHeroBackgroundGradientFrom ?? 'blue-600',
        publicHeroBackgroundGradientTo: payload.publicHeroBackgroundGradientTo ?? 'indigo-600',
        publicHeroBackgroundGradientDirection: payload.publicHeroBackgroundGradientDirection ?? 'to-br',
        publicHeroBackgroundImageUrl: payload.publicHeroBackgroundImageUrl ?? null,
        publicHeroBackgroundOverlay: payload.publicHeroBackgroundOverlay ?? 0.35,
        publicHeroBackgroundSliderIntervalMs: payload.publicHeroBackgroundSliderIntervalMs ?? 7000,
        publicHeroSlides: payload.publicHeroSlides ?? slides,
      } satisfies PublicLandingInitial));
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical">
        <p className="text-sm text-on-surface-variant">Chargement de la page publique…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-on-surface">Page publique & hero</h3>
        <p className="mt-1 text-sm text-on-surface-variant">
          Texte d’accueil, boutons, cartes de réassurance et arrière-plan administrables.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className={slideCard}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Identité & hero
            </h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="public-site-name">Nom public</Label>
                <Input
                  id="public-site-name"
                  value={state.publicSiteName}
                  onChange={(event) => updateField('publicSiteName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-doctor-name">Nom du médecin</Label>
                <Input
                  id="public-doctor-name"
                  value={state.publicDoctorDisplayName}
                  onChange={(event) => updateField('publicDoctorDisplayName', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-specialty">Spécialité</Label>
                <Input
                  id="public-specialty"
                  value={state.publicSpecialty}
                  onChange={(event) => updateField('publicSpecialty', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-hero-eyebrow">Accroche</Label>
                <Input
                  id="public-hero-eyebrow"
                  value={state.publicHeroEyebrow}
                  onChange={(event) => updateField('publicHeroEyebrow', event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="public-hero-title">Titre principal</Label>
                <Input
                  id="public-hero-title"
                  value={state.publicHeroTitle}
                  onChange={(event) => updateField('publicHeroTitle', event.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="public-hero-description">Description</Label>
                <Textarea
                  id="public-hero-description"
                  value={state.publicHeroDescription}
                  onChange={(event) => updateField('publicHeroDescription', event.target.value)}
                  className="min-h-28"
                />
              </div>
            </div>
          </section>

          <section className={slideCard}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Boutons & cartes
            </h4>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="public-primary-button">Bouton principal</Label>
                <Input
                  id="public-primary-button"
                  value={state.publicPrimaryButtonLabel}
                  onChange={(event) => updateField('publicPrimaryButtonLabel', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-secondary-button">Bouton secondaire</Label>
                <Input
                  id="public-secondary-button"
                  value={state.publicSecondaryButtonLabel}
                  onChange={(event) => updateField('publicSecondaryButtonLabel', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature1-title">Carte 1 — titre</Label>
                <Input
                  id="feature1-title"
                  value={state.publicFeature1Title}
                  onChange={(event) => updateField('publicFeature1Title', event.target.value)}
                />
                <Textarea
                  value={state.publicFeature1Description}
                  onChange={(event) => updateField('publicFeature1Description', event.target.value)}
                  className="min-h-20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feature2-title">Carte 2 — titre</Label>
                <Input
                  id="feature2-title"
                  value={state.publicFeature2Title}
                  onChange={(event) => updateField('publicFeature2Title', event.target.value)}
                />
                <Textarea
                  value={state.publicFeature2Description}
                  onChange={(event) => updateField('publicFeature2Description', event.target.value)}
                  className="min-h-20"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="feature3-title">Carte 3 — titre</Label>
                <Input
                  id="feature3-title"
                  value={state.publicFeature3Title}
                  onChange={(event) => updateField('publicFeature3Title', event.target.value)}
                />
                <Textarea
                  value={state.publicFeature3Description}
                  onChange={(event) => updateField('publicFeature3Description', event.target.value)}
                  className="min-h-20"
                />
              </div>
            </div>
          </section>

          <section className={slideCard}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              SEO
            </h4>
            <div className="mt-4 grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="public-meta-title">Titre</Label>
                <Input
                  id="public-meta-title"
                  value={state.publicMetaTitle}
                  onChange={(event) => updateField('publicMetaTitle', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="public-meta-description">Description</Label>
                <Textarea
                  id="public-meta-description"
                  value={state.publicMetaDescription}
                  onChange={(event) => updateField('publicMetaDescription', event.target.value)}
                  className="min-h-24"
                />
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className={slideCard}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Arrière-plan
            </h4>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="public-background-mode">Mode</Label>
                <Select
                  value={state.publicHeroBackgroundMode}
                  onValueChange={(value) =>
                    updateField('publicHeroBackgroundMode', value as PublicHeroBackgroundMode)
                  }
                >
                  <SelectTrigger id="public-background-mode">
                    <SelectValue placeholder="Choisir un mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PUBLIC_HERO_BACKGROUND_MODES.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="public-gradient-from">Départ</Label>
                  <Select
                    value={state.publicHeroBackgroundGradientFrom}
                    onValueChange={(value) =>
                      updateField('publicHeroBackgroundGradientFrom', value as PublicHeroBackgroundColor)
                    }
                  >
                    <SelectTrigger id="public-gradient-from">
                      <SelectValue placeholder="Départ" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_HERO_BACKGROUND_COLORS.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public-gradient-to">Arrivée</Label>
                  <Select
                    value={state.publicHeroBackgroundGradientTo}
                    onValueChange={(value) =>
                      updateField('publicHeroBackgroundGradientTo', value as PublicHeroBackgroundColor)
                    }
                  >
                    <SelectTrigger id="public-gradient-to">
                      <SelectValue placeholder="Arrivée" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_HERO_BACKGROUND_COLORS.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public-gradient-direction">Direction</Label>
                  <Select
                    value={state.publicHeroBackgroundGradientDirection}
                    onValueChange={(value) =>
                      updateField('publicHeroBackgroundGradientDirection', value as PublicHeroBackgroundDirection)
                    }
                  >
                    <SelectTrigger id="public-gradient-direction">
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                      {PUBLIC_HERO_BACKGROUND_DIRECTIONS.map((direction) => (
                        <SelectItem key={direction} value={direction}>
                          {direction}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="public-background-overlay">Overlay</Label>
                  <Input
                    id="public-background-overlay"
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={state.publicHeroBackgroundOverlay}
                    onChange={(event) => updateField('publicHeroBackgroundOverlay', event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="public-slider-interval">Intervalle slider (ms)</Label>
                  <Input
                    id="public-slider-interval"
                    type="number"
                    min={4000}
                    max={12000}
                    step={500}
                    value={state.publicHeroBackgroundSliderIntervalMs}
                    onChange={(event) =>
                      updateField('publicHeroBackgroundSliderIntervalMs', event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start"
                  disabled={uploading}
                  onClick={uploadBackground}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Upload…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mr-2 h-4 w-4" />
                      Importer une image
                    </>
                  )}
                </Button>
                {state.publicHeroBackgroundImageUrl ? (
                  <div className="rounded-lg border border-dashed border-outline-variant/25 p-2">
                    <p className="text-xs text-on-surface-variant">Image de fond actuelle</p>
                    <div className="mt-2 overflow-hidden rounded-lg">
                      <img
                        src={state.publicHeroBackgroundImageUrl}
                        alt=""
                        className="h-24 w-full object-cover"
                      />
                    </div>
                    {state.publicHeroBackgroundMode === 'IMAGE' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-2 h-8 px-2 text-xs text-slate-500"
                        onClick={async () => {
                          const current = state.publicHeroBackgroundImageUrl.trim();
                          if (!current) return;
                          if (!window.confirm('Supprimer l’image de fond actuelle ?')) return;
                          try {
                            const response = await fetch(
                              `/api/admin/settings/public-background/${encodeURIComponent(current)}`,
                              { method: 'DELETE', credentials: 'same-origin' }
                            );
                            const payload = await response.json().catch(() => ({}));
                            if (!response.ok) {
                              toast.error(payload?.error ?? 'Suppression impossible');
                              return;
                            }
                            updateField('publicHeroBackgroundImageUrl', '');
                            toast.success('Image retirée');
                          } catch {
                            toast.error('Erreur réseau');
                          }
                        }}
                      >
                        Retirer l’image
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {state.publicHeroBackgroundMode === 'SLIDER' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-on-surface">Images du slider</p>
                    <span className="text-xs text-on-surface-variant">{slides.length} image(s)</span>
                  </div>
                  <div className="space-y-3">
                    {slides.map((slide, index) => (
                      <div key={slide.id} className="rounded-xl border border-outline-variant/15 bg-surface p-3">
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <img
                            src={slide.imageUrl}
                            alt={slide.altText ?? ''}
                            className="h-20 w-full rounded-lg object-cover sm:w-28"
                          />
                          <div className="min-w-0 flex-1 space-y-2">
                            <Input
                              placeholder="Texte alternatif"
                              value={slide.altText ?? ''}
                              onChange={(event) =>
                                setSlides((current) =>
                                  current.map((item) =>
                                    item.id === slide.id ? { ...item, altText: event.target.value || null } : item
                                  )
                                )
                              }
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => moveSlide(index, -1)} disabled={index === 0}>
                                <ArrowUp className="mr-1 h-4 w-4" />
                                Monter
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => moveSlide(index, 1)}
                                disabled={index === slides.length - 1}
                              >
                                <ArrowDown className="mr-1 h-4 w-4" />
                                Descendre
                              </Button>
                              <Button type="button" variant={slide.isActive ? 'secondary' : 'outline'} size="sm" onClick={() => toggleSlide(slide.id)}>
                                {slide.isActive ? 'Actif' : 'Inactif'}
                              </Button>
                              <Button type="button" variant="destructive" size="sm" onClick={() => removeSlide(slide.id)}>
                                <Trash2 className="mr-1 h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className={slideCard}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
              Aperçu
            </h4>
            <div className="mt-4 overflow-hidden rounded-2xl border border-outline-variant/15">
              {previewPayload ? (
                <div className="relative h-[360px]">
                  <PublicHeroBackground
                    mode={previewPayload.publicHeroBackgroundMode}
                    gradientFrom={previewPayload.publicHeroBackgroundGradientFrom}
                    gradientTo={previewPayload.publicHeroBackgroundGradientTo}
                    gradientDirection={previewPayload.publicHeroBackgroundGradientDirection}
                    imageUrl={previewPayload.publicHeroBackgroundImageUrl}
                    overlay={previewPayload.publicHeroBackgroundOverlay}
                    sliderIntervalMs={previewPayload.publicHeroBackgroundSliderIntervalMs}
                    slides={previewPayload.publicHeroSlides}
                  />
                  <div className="absolute inset-0 bg-white/25" />
                  <div className="relative flex h-full flex-col justify-center px-5 py-6 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {previewPayload.publicHeroEyebrow}
                    </p>
                    <h5 className="mt-4 text-2xl font-semibold text-slate-900">{previewPayload.publicHeroTitle}</h5>
                    <p className="mt-3 text-sm text-slate-600">{previewPayload.publicHeroDescription}</p>
                    <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                      <span className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold shadow-sm">
                        {previewPayload.publicPrimaryButtonLabel}
                      </span>
                      <span className="rounded-full bg-white/80 px-4 py-2 text-xs font-semibold shadow-sm">
                        {previewPayload.publicSecondaryButtonLabel}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" disabled={saving} onClick={() => onSaved?.()}>
            Fermer
          </Button>
          <Button type="button" className="bg-blue-600 hover:bg-blue-700" disabled={saving} onClick={handleSave}>
            {saving ? 'Enregistrement…' : 'Enregistrer la page publique'}
          </Button>
        </div>
      </div>
    </div>
  );
}
