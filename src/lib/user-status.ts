import type { UserStatus } from '@/generated/prisma/client';

/** Statuts persistés en base (enum Prisma UserStatus). */
export type UserStatusType =
  | 'AVAILABLE'
  | 'BUSY'
  | 'IN_CONSULTATION'
  | 'ON_BREAK'
  | 'AWAY'
  | 'DONE_TODAY'
  | 'OFFLINE';

export const USER_STATUS_VALUES: UserStatusType[] = [
  'AVAILABLE',
  'BUSY',
  'IN_CONSULTATION',
  'ON_BREAK',
  'AWAY',
  'DONE_TODAY',
  'OFFLINE',
];

export const USER_STATUS_LABELS: Record<UserStatusType, string> = {
  AVAILABLE: 'Disponible',
  BUSY: 'Occupé',
  IN_CONSULTATION: 'En consultation',
  ON_BREAK: 'Pause',
  AWAY: 'Absent',
  DONE_TODAY: 'Terminé pour aujourd’hui',
  OFFLINE: 'Hors ligne',
};

/** Statuts manuels proposés au médecin pour changement rapide. */
export const DOCTOR_QUICK_STATUSES: UserStatusType[] = [
  'AVAILABLE',
  'BUSY',
  'ON_BREAK',
  'AWAY',
  'DONE_TODAY',
];

export const MANUAL_DOCTOR_STATUSES: UserStatusType[] = [
  'AVAILABLE',
  'BUSY',
  'ON_BREAK',
  'AWAY',
  'DONE_TODAY',
];

export function isManualDoctorStatus(s: unknown): s is Exclude<UserStatusType, 'IN_CONSULTATION' | 'OFFLINE'> {
  return typeof s === 'string' && MANUAL_DOCTOR_STATUSES.includes(s as UserStatusType);
}

export function isUserStatus(s: unknown): s is UserStatusType {
  return typeof s === 'string' && USER_STATUS_VALUES.includes(s as UserStatusType);
}

export function normalizeUserStatusInput(s: unknown): UserStatusType | null {
  if (s === 'ABSENT') return 'AWAY';
  return isUserStatus(s) ? s : null;
}

export function normalizeManualDoctorStatusInput(s: unknown): Exclude<UserStatusType, 'IN_CONSULTATION' | 'OFFLINE'> | null {
  const normalized = normalizeUserStatusInput(s);
  return normalized && isManualDoctorStatus(normalized) ? normalized : null;
}

export function canReceivePatient(status: UserStatusType): boolean {
  return status === 'AVAILABLE';
}

export type StatusPresentation = {
  label: string;
  tone: 'success' | 'info' | 'warning' | 'neutral' | 'danger';
  bar: string;
  iconWrap: string;
  badge: string;
};

export function statusPresentation(s: UserStatusType): StatusPresentation {
  switch (s) {
    case 'AVAILABLE':
      return {
        label: USER_STATUS_LABELS.AVAILABLE,
        tone: 'success',
        bar: 'from-emerald-500 to-emerald-600',
        iconWrap: 'bg-emerald-500 text-white shadow-emerald-500/25',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'IN_CONSULTATION':
      return {
        label: USER_STATUS_LABELS.IN_CONSULTATION,
        tone: 'info',
        bar: 'from-blue-500 to-blue-600',
        iconWrap: 'bg-blue-500 text-white shadow-blue-500/25',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
      };
    case 'BUSY':
      return {
        label: USER_STATUS_LABELS.BUSY,
        tone: 'info',
        bar: 'from-sky-500 to-sky-600',
        iconWrap: 'bg-sky-500 text-white shadow-sky-500/25',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    case 'ON_BREAK':
      return {
        label: USER_STATUS_LABELS.ON_BREAK,
        tone: 'warning',
        bar: 'from-amber-500 to-amber-600',
        iconWrap: 'bg-amber-500 text-white shadow-amber-500/25',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'AWAY':
      return {
        label: USER_STATUS_LABELS.AWAY,
        tone: 'neutral',
        bar: 'from-slate-400 to-slate-500',
        iconWrap: 'bg-slate-400 text-white shadow-slate-400/25',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
      };
    case 'DONE_TODAY':
      return {
        label: USER_STATUS_LABELS.DONE_TODAY,
        tone: 'neutral',
        bar: 'from-slate-500 to-slate-600',
        iconWrap: 'bg-slate-500 text-white shadow-slate-500/25',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    default:
      return {
        label: USER_STATUS_LABELS.OFFLINE,
        tone: 'neutral',
        bar: 'from-slate-300 to-slate-400',
        iconWrap: 'bg-slate-300 text-slate-700 shadow-slate-300/25',
        badge: 'bg-slate-50 text-slate-500 border-slate-200',
      };
  }
}

/** Bordure autour de l’avatar médecin. */
export function statusAvatarRing(s: UserStatusType): string {
  switch (s) {
    case 'AVAILABLE':
      return 'ring-[3px] ring-emerald-500 ring-offset-2 ring-offset-white';
    case 'IN_CONSULTATION':
    case 'BUSY':
      return 'ring-[3px] ring-blue-500 ring-offset-2 ring-offset-white';
    case 'ON_BREAK':
      return 'ring-[3px] ring-amber-500 ring-offset-2 ring-offset-white';
    case 'AWAY':
    case 'DONE_TODAY':
      return 'ring-[3px] ring-slate-400 ring-offset-2 ring-offset-white';
    default:
      return 'ring-[3px] ring-slate-300 ring-offset-2 ring-offset-white';
  }
}

export function statusDotSolid(s: UserStatusType): string {
  switch (s) {
    case 'AVAILABLE':
      return 'bg-emerald-500';
    case 'IN_CONSULTATION':
    case 'BUSY':
      return 'bg-blue-500';
    case 'ON_BREAK':
      return 'bg-amber-500';
    case 'AWAY':
    case 'DONE_TODAY':
      return 'bg-slate-400';
    default:
      return 'bg-slate-300';
  }
}

/** Si une consultation est en cours, le statut effectif prime sur le statut manuel. */
export function resolveEffectiveStatus(
  manualStatus: UserStatusType,
  hasInProgressConsultation: boolean
): UserStatusType {
  if (hasInProgressConsultation) return 'IN_CONSULTATION';
  return manualStatus;
}

export function toPrismaUserStatus(s: UserStatusType): UserStatus {
  return s as UserStatus;
}
