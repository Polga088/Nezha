/** Clé SWR partagée (landing, sidebar, fiche cabinet publique). */
export const PUBLIC_CABINET_SWR_KEY = '/api/public/cabinet' as const;

export const DEFAULT_CABINET_MAP_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d53183.238567689076!2d-7.675682649999999!3d33.586942049999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda62cbd85bf5a609%3A0x59b632444d3a448f!2sCasablanca%2C%20Maroc!5e0!3m2!1sfr!2sma!4v1712659200000!5m2!1sfr!2sma';

export type OpeningHourRow = { jour: string; plage: string };

export const PUBLIC_HERO_BACKGROUND_MODES = ['GRADIENT', 'IMAGE', 'SLIDER', 'ANIMATED'] as const;
export type PublicHeroBackgroundMode = (typeof PUBLIC_HERO_BACKGROUND_MODES)[number];

export const PUBLIC_HERO_BACKGROUND_DIRECTIONS = ['to-r', 'to-br', 'to-b', 'to-tr', 'to-l'] as const;
export type PublicHeroBackgroundDirection = (typeof PUBLIC_HERO_BACKGROUND_DIRECTIONS)[number];

export const PUBLIC_HERO_BACKGROUND_COLORS = [
  'slate-900',
  'blue-600',
  'indigo-600',
  'sky-600',
  'emerald-600',
  'violet-600',
  'rose-600',
] as const;
export type PublicHeroBackgroundColor = (typeof PUBLIC_HERO_BACKGROUND_COLORS)[number];

export type PublicHeroSlideRow = {
  id: string;
  imageUrl: string;
  altText: string | null;
  position: number;
  isActive: boolean;
};

export const DEFAULT_OPENING_HOURS: OpeningHourRow[] = [
  { jour: 'Lun. — Ven.', plage: '9h00 — 18h00' },
  { jour: 'Samedi', plage: '9h00 — 13h00' },
  { jour: 'Dimanche', plage: 'Fermé' },
];

export type PublicCabinetBranding = {
  cabinetName: string;
  doctorDisplayName: string;
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
  publicHeroBackgroundImageUrl: string | null;
  publicHeroBackgroundOverlay: number;
  publicHeroBackgroundSliderIntervalMs: number;
  publicHeroSlides: PublicHeroSlideRow[];
  logoUrl: string | null;
  phone: string;
  email: string;
  address: string;
  cityLine: string;
  mapEmbedUrl: string;
  openingHours: OpeningHourRow[];
};

export type GlobalSettingsBrandingRow = {
  cabinetName: string | null;
  doctorDisplayName: string | null;
  publicSiteName?: string | null;
  publicDoctorDisplayName?: string | null;
  publicSpecialty?: string | null;
  publicHeroEyebrow?: string | null;
  publicHeroTitle?: string | null;
  publicHeroDescription?: string | null;
  publicPrimaryButtonLabel?: string | null;
  publicSecondaryButtonLabel?: string | null;
  publicFeature1Title?: string | null;
  publicFeature1Description?: string | null;
  publicFeature2Title?: string | null;
  publicFeature2Description?: string | null;
  publicFeature3Title?: string | null;
  publicFeature3Description?: string | null;
  publicMetaTitle?: string | null;
  publicMetaDescription?: string | null;
  publicHeroBackgroundMode?: string | null;
  publicHeroBackgroundGradientFrom?: string | null;
  publicHeroBackgroundGradientTo?: string | null;
  publicHeroBackgroundGradientDirection?: string | null;
  publicHeroBackgroundImageUrl?: string | null;
  publicHeroBackgroundOverlay?: number | null;
  publicHeroBackgroundSliderIntervalMs?: number | null;
  publicHeroSlides?: PublicHeroSlideRow[] | null;
  logoUrl: string | null;
  cabinetPhone: string | null;
  cabinetEmail: string | null;
  cabinetAddress: string | null;
  cabinetCityLine: string | null;
  doctorInpe?: string | null;
  doctorSpecialty?: string | null;
  mapEmbedUrl: string | null;
  openingHours: unknown;
};

/** Reprise des horaires stockés pour édition (formulaire admin). */
export function openingHoursFromDb(raw: unknown): OpeningHourRow[] {
  return parseOpeningHoursFromDb(raw) ?? DEFAULT_OPENING_HOURS;
}

function parseOpeningHoursFromDb(raw: unknown): OpeningHourRow[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: OpeningHourRow[] = [];
  for (const x of raw) {
    if (!x || typeof x !== 'object') return null;
    const o = x as Record<string, unknown>;
    const jour = typeof o.jour === 'string' ? o.jour.trim() : '';
    const plage = typeof o.plage === 'string' ? o.plage.trim() : '';
    if (!jour || !plage) return null;
    out.push({ jour, plage });
  }
  return out.length > 0 ? out : null;
}

function mapEmbedFromEnv(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_CABINET_GOOGLE_MAPS_EMBED_URL
      ? process.env.NEXT_PUBLIC_CABINET_GOOGLE_MAPS_EMBED_URL.trim()
      : '';
  return fromEnv.length > 0 ? fromEnv : DEFAULT_CABINET_MAP_EMBED;
}

/** Valeurs affichées côté public (champs vides en base → défauts). */
export function mergePublicCabinetBranding(row: GlobalSettingsBrandingRow): PublicCabinetBranding {
  const hours = parseOpeningHoursFromDb(row.openingHours) ?? DEFAULT_OPENING_HOURS;
  const publicHeroBackgroundMode = PUBLIC_HERO_BACKGROUND_MODES.includes(
    row.publicHeroBackgroundMode as PublicHeroBackgroundMode
  )
    ? (row.publicHeroBackgroundMode as PublicHeroBackgroundMode)
    : 'GRADIENT';
  const publicHeroBackgroundGradientFrom = PUBLIC_HERO_BACKGROUND_COLORS.includes(
    row.publicHeroBackgroundGradientFrom as PublicHeroBackgroundColor
  )
    ? (row.publicHeroBackgroundGradientFrom as PublicHeroBackgroundColor)
    : 'blue-600';
  const publicHeroBackgroundGradientTo = PUBLIC_HERO_BACKGROUND_COLORS.includes(
    row.publicHeroBackgroundGradientTo as PublicHeroBackgroundColor
  )
    ? (row.publicHeroBackgroundGradientTo as PublicHeroBackgroundColor)
    : 'indigo-600';
  const publicHeroBackgroundGradientDirection = PUBLIC_HERO_BACKGROUND_DIRECTIONS.includes(
    row.publicHeroBackgroundGradientDirection as PublicHeroBackgroundDirection
  )
    ? (row.publicHeroBackgroundGradientDirection as PublicHeroBackgroundDirection)
    : 'to-br';
  return {
    cabinetName: row.cabinetName?.trim() || 'Nezha Medical',
    doctorDisplayName: row.doctorDisplayName?.trim() || 'Dr. EL MAAROUFI Nezha',
    publicSiteName: row.publicSiteName?.trim() || row.cabinetName?.trim() || 'Nezha Medical',
    publicDoctorDisplayName:
      row.publicDoctorDisplayName?.trim() || row.doctorDisplayName?.trim() || 'Dr. EL MAAROUFI Nezha',
    publicSpecialty: row.publicSpecialty?.trim() || row.doctorSpecialty?.trim() || 'Médecine générale',
    publicHeroEyebrow: row.publicHeroEyebrow?.trim() || 'Cabinet médical privé',
    publicHeroTitle:
      row.publicHeroTitle?.trim() ||
      'Une prise en charge claire, humaine et élégante.',
    publicHeroDescription:
      row.publicHeroDescription?.trim() ||
      'Prenez rendez-vous, consultez vos repères utiles et contactez le cabinet dans un espace sobre et rassurant.',
    publicPrimaryButtonLabel: row.publicPrimaryButtonLabel?.trim() || 'Réserver un rendez-vous',
    publicSecondaryButtonLabel: row.publicSecondaryButtonLabel?.trim() || 'Adresse & horaires',
    publicFeature1Title: row.publicFeature1Title?.trim() || 'Confidentialité renforcée',
    publicFeature1Description:
      row.publicFeature1Description?.trim() ||
      'Des échanges simples, protégés et pensés pour la discrétion médicale.',
    publicFeature2Title: row.publicFeature2Title?.trim() || 'Contact direct',
    publicFeature2Description:
      row.publicFeature2Description?.trim() ||
      'Appelez ou écrivez au cabinet en quelques secondes.',
    publicFeature3Title: row.publicFeature3Title?.trim() || 'Suivi fluide',
    publicFeature3Description:
      row.publicFeature3Description?.trim() ||
      'Les informations essentielles restent accessibles au bon moment.',
    publicMetaTitle: row.publicMetaTitle?.trim() || row.cabinetName?.trim() || 'Nezha Medical',
    publicMetaDescription:
      row.publicMetaDescription?.trim() ||
      `Cabinet médical ${row.cabinetName?.trim() || 'Nezha Medical'} — ${row.doctorDisplayName?.trim() || 'Dr. EL MAAROUFI Nezha'}. Contact, horaires et vérification de documents.`,
    publicHeroBackgroundMode,
    publicHeroBackgroundGradientFrom,
    publicHeroBackgroundGradientTo,
    publicHeroBackgroundGradientDirection,
    publicHeroBackgroundImageUrl: row.publicHeroBackgroundImageUrl?.trim() || null,
    publicHeroBackgroundOverlay:
      typeof row.publicHeroBackgroundOverlay === 'number' &&
      Number.isFinite(row.publicHeroBackgroundOverlay) &&
      row.publicHeroBackgroundOverlay >= 0 &&
      row.publicHeroBackgroundOverlay <= 1
        ? row.publicHeroBackgroundOverlay
        : 0.35,
    publicHeroBackgroundSliderIntervalMs:
      typeof row.publicHeroBackgroundSliderIntervalMs === 'number' &&
      Number.isFinite(row.publicHeroBackgroundSliderIntervalMs) &&
      row.publicHeroBackgroundSliderIntervalMs >= 4000 &&
      row.publicHeroBackgroundSliderIntervalMs <= 12000
        ? row.publicHeroBackgroundSliderIntervalMs
        : 7000,
    publicHeroSlides: row.publicHeroSlides ?? [],
    logoUrl: row.logoUrl?.trim() ? row.logoUrl.trim() : null,
    phone: row.cabinetPhone?.trim() || '+212 5XX XX XX XX',
    email: row.cabinetEmail?.trim() || 'contact@nezha-medical.ma',
    address: row.cabinetAddress?.trim() || 'Adresse du cabinet — à personnaliser',
    cityLine: row.cabinetCityLine?.trim() || 'Casablanca, Maroc',
    mapEmbedUrl: row.mapEmbedUrl?.trim() || mapEmbedFromEnv(),
    openingHours: hours,
  };
}

function parsePublicHeroBackgroundMode(raw: unknown): PublicHeroBackgroundMode | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toUpperCase();
  return PUBLIC_HERO_BACKGROUND_MODES.includes(value as PublicHeroBackgroundMode)
    ? (value as PublicHeroBackgroundMode)
    : null;
}

function parsePublicHeroBackgroundColor(raw: unknown): PublicHeroBackgroundColor | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return PUBLIC_HERO_BACKGROUND_COLORS.includes(value as PublicHeroBackgroundColor)
    ? (value as PublicHeroBackgroundColor)
    : null;
}

function parsePublicHeroBackgroundDirection(raw: unknown): PublicHeroBackgroundDirection | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return PUBLIC_HERO_BACKGROUND_DIRECTIONS.includes(value as PublicHeroBackgroundDirection)
    ? (value as PublicHeroBackgroundDirection)
    : null;
}

function parsePublicHeroNumber(raw: unknown, min: number, max: number): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

export function parsePublicLandingPatch(body: Record<string, unknown>): {
  ok: true;
  data: Partial<Pick<
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
  >>;
} | { ok: false; error: string } {
  const data: Partial<Record<keyof PublicCabinetBranding, unknown>> = {};
  const fields: [keyof PublicCabinetBranding, number][] = [
    ['publicSiteName', 120],
    ['publicDoctorDisplayName', 200],
    ['publicSpecialty', 120],
    ['publicHeroEyebrow', 120],
    ['publicHeroTitle', 240],
    ['publicHeroDescription', 500],
    ['publicPrimaryButtonLabel', 60],
    ['publicSecondaryButtonLabel', 60],
    ['publicFeature1Title', 80],
    ['publicFeature1Description', 160],
    ['publicFeature2Title', 80],
    ['publicFeature2Description', 160],
    ['publicFeature3Title', 80],
    ['publicFeature3Description', 160],
    ['publicMetaTitle', 120],
    ['publicMetaDescription', 280],
    ['publicHeroBackgroundImageUrl', 2048],
  ];

  for (const [key, max] of fields) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (raw === null) {
      data[key] = null;
      continue;
    }
    if (typeof raw !== 'string') {
      return { ok: false, error: `${String(key)} doit être une chaîne ou null` };
    }
    const text = raw.trim();
    data[key] = text === '' ? null : text.slice(0, max);
  }

  if ('publicHeroBackgroundMode' in body) {
    const parsed = parsePublicHeroBackgroundMode(body.publicHeroBackgroundMode);
    if (!parsed) {
      return { ok: false, error: 'publicHeroBackgroundMode invalide' };
    }
    data.publicHeroBackgroundMode = parsed;
  }

  if ('publicHeroBackgroundGradientFrom' in body) {
    const parsed = parsePublicHeroBackgroundColor(body.publicHeroBackgroundGradientFrom);
    if (!parsed) {
      return { ok: false, error: 'publicHeroBackgroundGradientFrom invalide' };
    }
    data.publicHeroBackgroundGradientFrom = parsed;
  }

  if ('publicHeroBackgroundGradientTo' in body) {
    const parsed = parsePublicHeroBackgroundColor(body.publicHeroBackgroundGradientTo);
    if (!parsed) {
      return { ok: false, error: 'publicHeroBackgroundGradientTo invalide' };
    }
    data.publicHeroBackgroundGradientTo = parsed;
  }

  if ('publicHeroBackgroundGradientDirection' in body) {
    const parsed = parsePublicHeroBackgroundDirection(body.publicHeroBackgroundGradientDirection);
    if (!parsed) {
      return { ok: false, error: 'publicHeroBackgroundGradientDirection invalide' };
    }
    data.publicHeroBackgroundGradientDirection = parsed;
  }

  if ('publicHeroBackgroundOverlay' in body) {
    const parsed = parsePublicHeroNumber(body.publicHeroBackgroundOverlay, 0, 1);
    if (parsed === null) {
      return { ok: false, error: 'publicHeroBackgroundOverlay doit être un nombre entre 0 et 1' };
    }
    data.publicHeroBackgroundOverlay = parsed;
  }

  if ('publicHeroBackgroundSliderIntervalMs' in body) {
    const parsed = parsePublicHeroNumber(body.publicHeroBackgroundSliderIntervalMs, 4000, 12000);
    if (parsed === null) {
      return { ok: false, error: 'publicHeroBackgroundSliderIntervalMs doit être entre 4000 et 12000' };
    }
    data.publicHeroBackgroundSliderIntervalMs = parsed;
  }

  return { ok: true, data: data as Partial<PublicCabinetBranding> };
}

export function parseOpeningHoursInput(
  input: unknown
): { ok: true; value: OpeningHourRow[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'openingHours doit être un tableau { jour, plage }' };
  }
  if (input.length === 0 || input.length > 14) {
    return { ok: false, error: 'Entre 1 et 14 lignes d’horaires' };
  }
  const out: OpeningHourRow[] = [];
  for (const x of input) {
    if (!x || typeof x !== 'object') {
      return { ok: false, error: 'Chaque horaire doit être un objet { jour, plage }' };
    }
    const o = x as Record<string, unknown>;
    const jour = typeof o.jour === 'string' ? o.jour.trim() : '';
    const plage = typeof o.plage === 'string' ? o.plage.trim() : '';
    if (!jour || jour.length > 80) {
      return { ok: false, error: 'jour : texte requis (max 80 car.)' };
    }
    if (!plage || plage.length > 80) {
      return { ok: false, error: 'plage : texte requis (max 80 car.)' };
    }
    out.push({ jour, plage });
  }
  return { ok: true, value: out };
}

/** Normalise les champs branding d’un PATCH JSON (valeurs invalides → erreur). */
export function parseBrandingPatch(body: Record<string, unknown>): {
  ok: true;
  data: {
    cabinetName?: string | null;
    doctorDisplayName?: string | null;
    logoUrl?: string | null;
    cabinetPhone?: string | null;
    cabinetEmail?: string | null;
    cabinetAddress?: string | null;
    cabinetCityLine?: string | null;
    doctorInpe?: string | null;
    doctorSpecialty?: string | null;
    mapEmbedUrl?: string | null;
    openingHours?: OpeningHourRow[] | null;
  };
} | { ok: false; error: string } {
  const data: {
    cabinetName?: string | null;
    doctorDisplayName?: string | null;
    logoUrl?: string | null;
    cabinetPhone?: string | null;
    cabinetEmail?: string | null;
    cabinetAddress?: string | null;
    cabinetCityLine?: string | null;
    doctorInpe?: string | null;
    doctorSpecialty?: string | null;
    mapEmbedUrl?: string | null;
    openingHours?: OpeningHourRow[] | null;
  } = {};

  const keys: [string, number][] = [
    ['cabinetName', 120],
    ['doctorDisplayName', 200],
    ['logoUrl', 2048],
    ['cabinetPhone', 60],
    ['cabinetEmail', 120],
    ['cabinetAddress', 500],
    ['cabinetCityLine', 200],
    ['doctorInpe', 80],
    ['doctorSpecialty', 200],
    ['mapEmbedUrl', 4096],
  ];

  for (const [k, max] of keys) {
    if (!(k in body)) continue;
    const raw = body[k];
    if (raw === null) {
      (data as Record<string, unknown>)[k] = null;
      continue;
    }
    if (typeof raw !== 'string') {
      return { ok: false, error: `${k} doit être une chaîne ou null` };
    }
    const t = raw.trim();
    if (t.length === 0) {
      (data as Record<string, unknown>)[k] = null;
      continue;
    }
    if (t.length > max) {
      return { ok: false, error: `${k} trop long` };
    }
    if (k === 'cabinetEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
      return { ok: false, error: 'Email cabinet invalide' };
    }
    (data as Record<string, unknown>)[k] = t;
  }

  if ('openingHours' in body) {
    const oh = body.openingHours;
    if (oh === null) {
      data.openingHours = null;
    } else {
      const parsed = parseOpeningHoursInput(oh);
      if (!parsed.ok) return { ok: false, error: parsed.error };
      data.openingHours = parsed.value;
    }
  }

  return { ok: true, data };
}
