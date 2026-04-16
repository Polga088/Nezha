import { mergePublicCabinetBranding, type GlobalSettingsBrandingRow } from '@/lib/cabinet-branding';

/** Champs GlobalSettings utiles au PDF ordonnance (serveur). */
export type PrescriptionPdfGlobalRow = Pick<
  GlobalSettingsBrandingRow,
  | 'cabinetName'
  | 'doctorDisplayName'
  | 'logoUrl'
  | 'cabinetPhone'
  | 'cabinetAddress'
  | 'cabinetCityLine'
> & {
  doctorInpe?: string | null;
  doctorSpecialty?: string | null;
};

/**
 * Ligne de signature PDF : préfixe « Dr. » si absent (évite « Dr. Dr. … »).
 */
export const formatDoctorSignatureLine = (displayName: string): string => {
  const t = displayName.trim();
  if (!t) return 'Dr.';
  if (/^dr\.?\s/i.test(t)) return t;
  return `Dr. ${t}`;
};

/**
 * Construit l’identité affichée sur l’ordonnance à partir des réglages cabinet (avec défauts publics).
 */
export const buildPrescriptionPdfBranding = (row: PrescriptionPdfGlobalRow) => {
  const merged = mergePublicCabinetBranding({
    cabinetName: row.cabinetName,
    doctorDisplayName: row.doctorDisplayName,
    logoUrl: row.logoUrl,
    cabinetPhone: row.cabinetPhone,
    cabinetEmail: null,
    cabinetAddress: row.cabinetAddress,
    cabinetCityLine: row.cabinetCityLine,
    mapEmbedUrl: null,
    openingHours: null,
  });

  const inpe = row.doctorInpe?.trim() || null;
  const specialty = row.doctorSpecialty?.trim() || null;

  const addr = merged.address.trim();
  const city = merged.cityLine.trim();
  const fullAddress =
    addr && city ? `${addr}\n${city}` : addr || city || '';

  return {
    cabinetName: merged.cabinetName,
    doctorLine: formatDoctorSignatureLine(merged.doctorDisplayName),
    phone: merged.phone,
    fullAddress,
    inpe,
    specialty,
  };
};

export type PrescriptionPdfLayoutCore = ReturnType<typeof buildPrescriptionPdfBranding>;

/** Branding + URL logo résolue pour le rendu PDF. */
export type PrescriptionPdfLayoutBranding = PrescriptionPdfLayoutCore & {
  logoUrlResolved: string | null;
};
