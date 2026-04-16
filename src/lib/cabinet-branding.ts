/** Clé SWR partagée (landing, sidebar, fiche cabinet publique). */
export const PUBLIC_CABINET_SWR_KEY = '/api/public/cabinet' as const;

export const DEFAULT_CABINET_MAP_EMBED =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d53183.238567689076!2d-7.675682649999999!3d33.586942049999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda62cbd85bf5a609%3A0x59b632444d3a448f!2sCasablanca%2C%20Maroc!5e0!3m2!1sfr!2sma!4v1712659200000!5m2!1sfr!2sma';

export type OpeningHourRow = { jour: string; plage: string };

export const DEFAULT_OPENING_HOURS: OpeningHourRow[] = [
  { jour: 'Lun. — Ven.', plage: '9h00 — 18h00' },
  { jour: 'Samedi', plage: '9h00 — 13h00' },
  { jour: 'Dimanche', plage: 'Fermé' },
];

export type PublicCabinetBranding = {
  cabinetName: string;
  doctorDisplayName: string;
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
  return {
    cabinetName: row.cabinetName?.trim() || 'Nezha Medical',
    doctorDisplayName: row.doctorDisplayName?.trim() || 'Dr. EL MAAROUFI Nezha',
    logoUrl: row.logoUrl?.trim() ? row.logoUrl.trim() : null,
    phone: row.cabinetPhone?.trim() || '+212 5XX XX XX XX',
    email: row.cabinetEmail?.trim() || 'contact@nezha-medical.ma',
    address: row.cabinetAddress?.trim() || 'Adresse du cabinet — à personnaliser',
    cityLine: row.cabinetCityLine?.trim() || 'Casablanca, Maroc',
    mapEmbedUrl: row.mapEmbedUrl?.trim() || mapEmbedFromEnv(),
    openingHours: hours,
  };
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
