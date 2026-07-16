export const CONSULTATION_TYPE_VALUES = [
  'FIRST_CONSULTATION',
  'CONSULTATION',
  'CONTROL',
  'FOLLOW_UP',
  'EMERGENCY',
  'VACCINATION',
  'ANNUAL_VISIT',
  'PRESCRIPTION_RENEWAL',
  'TELECONSULTATION',
  'EXAM_RESULT',
  'MEDICAL_CERTIFICATE',
  'OTHER',
] as const;

export type ConsultationTypeValue = (typeof CONSULTATION_TYPE_VALUES)[number];

export const DEFAULT_CONSULTATION_TYPE: ConsultationTypeValue = 'CONSULTATION';

export const CONSULTATION_TYPE_LABELS: Record<ConsultationTypeValue, string> = {
  FIRST_CONSULTATION: 'Première consultation',
  CONSULTATION: 'Consultation',
  CONTROL: 'Consultation de contrôle',
  FOLLOW_UP: 'Contrôle',
  EMERGENCY: 'Urgence',
  VACCINATION: 'Vaccination',
  ANNUAL_VISIT: 'Visite annuelle',
  PRESCRIPTION_RENEWAL: 'Renouvellement d’ordonnance',
  TELECONSULTATION: 'Téléconsultation',
  EXAM_RESULT: 'Résultat d’examen',
  MEDICAL_CERTIFICATE: 'Certificat médical',
  OTHER: 'Autre',
};

export type ConsultationTypeOption = {
  value: ConsultationTypeValue;
  label: string;
};

export const CONSULTATION_TYPE_OPTIONS: ConsultationTypeOption[] = CONSULTATION_TYPE_VALUES.map((value) => ({
  value,
  label: CONSULTATION_TYPE_LABELS[value],
}));

export function isConsultationTypeValue(value: unknown): value is ConsultationTypeValue {
  return typeof value === 'string' && (CONSULTATION_TYPE_VALUES as readonly string[]).includes(value);
}

export function normalizeConsultationType(value: unknown): ConsultationTypeValue {
  return isConsultationTypeValue(value) ? value : DEFAULT_CONSULTATION_TYPE;
}

export function getConsultationTypeLabel(value: unknown): string {
  const normalized = isConsultationTypeValue(value) ? value : DEFAULT_CONSULTATION_TYPE;
  return CONSULTATION_TYPE_LABELS[normalized];
}
