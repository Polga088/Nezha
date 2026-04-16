import type { View } from 'react-big-calendar';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

export function getVisibleRange(date: Date, view: View): { from: Date; to: Date } {
  switch (view) {
    case 'month':
      return { from: startOfMonth(date), to: endOfMonth(date) };
    case 'week':
    case 'work_week':
      return {
        from: startOfWeek(date, { weekStartsOn: 1 }),
        to: endOfWeek(date, { weekStartsOn: 1 }),
      };
    case 'day':
    case 'agenda':
    default:
      return { from: startOfDay(date), to: endOfDay(date) };
  }
}

/** Même logique de requête que l’agenda principal : plage ISO + filtre médecin */
export function buildAppointmentsQuery(
  range: { from: Date; to: Date },
  opts: {
    doctorId: string | null;
    role: string | undefined;
    /** Admin / assistante : si défini, restreint l’agenda à ce médecin (admin : omettre = tous) */
    agendaFilterDoctorId?: string | null;
  }
): string {
  const p = new URLSearchParams();
  p.set('from', range.from.toISOString());
  p.set('to', range.to.toISOString());
  const role = String(opts.role ?? '').toUpperCase();
  if (role === 'DOCTOR' && opts.doctorId) {
    p.set('doctor_id', opts.doctorId);
  } else if ((role === 'ADMIN' || role === 'ASSISTANT') && opts.agendaFilterDoctorId) {
    p.set('doctor_id', opts.agendaFilterDoctorId);
  }
  return p.toString();
}

/** Aperçu dashboard : journée courante (même endpoint, plage d’un jour) */
export function getTodayRange(now = new Date()): { from: Date; to: Date } {
  return { from: startOfDay(now), to: endOfDay(now) };
}

/**
 * File d’attente du jour : RDV `WAITING`, tri `queue=1` (URGENT d’abord).
 * - Médecin : `doctor_id` imposé côté API (ID connecté).
 * - Assistante / admin : `doctorId` optionnel = filtre ; omis = tous les médecins.
 */
export function buildWaitingQueueQuery(
  range: { from: Date; to: Date },
  opts?: { doctorId?: string | null }
): string {
  const p = new URLSearchParams();
  p.set('from', range.from.toISOString());
  p.set('to', range.to.toISOString());
  p.set('statut', 'WAITING');
  p.set('queue', '1');
  const d = opts?.doctorId?.trim();
  if (d) {
    p.set('doctor_id', d);
  }
  return p.toString();
}

/** RDV du jour filtrés par statut (ex. FINISHED / PAID pour encaissement et suivi). */
export function buildAppointmentsByStatutQuery(
  range: { from: Date; to: Date },
  statut: 'FINISHED' | 'PAID',
  opts?: { doctorId?: string | null }
): string {
  const p = new URLSearchParams();
  p.set('from', range.from.toISOString());
  p.set('to', range.to.toISOString());
  p.set('statut', statut);
  const d = opts?.doctorId?.trim();
  if (d) {
    p.set('doctor_id', d);
  }
  return p.toString();
}
