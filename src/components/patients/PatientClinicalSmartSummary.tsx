'use client';

import { differenceInCalendarDays } from 'date-fns';
import { CalendarClock } from 'lucide-react';

type AppointmentLite = {
  date_heure: string;
  motif: string;
};

type Props = {
  appointments: AppointmentLite[] | undefined | null;
};

/**
 * Résumé textuel : dernière consultation + motif.
 */
export function PatientClinicalSmartSummary({ appointments }: Props) {
  const list = Array.isArray(appointments) ? appointments : [];
  const last = list[0];

  if (!last) {
    return (
      <p className="text-sm leading-relaxed text-slate-600">
        <span className="font-medium text-slate-800">Aucune consultation</span> enregistrée pour ce
        patient dans le système.
      </p>
    );
  }

  const consultDate = new Date(last.date_heure);
  const days = differenceInCalendarDays(new Date(), consultDate);
  let delai: string;
  if (days < 0) {
    delai = `programmée dans ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`;
  } else if (days === 0) {
    delai = "aujourd'hui";
  } else if (days === 1) {
    delai = 'hier';
  } else {
    delai = `il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  return (
    <div className="flex gap-3 rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
        <CalendarClock className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm leading-relaxed text-slate-700">
        <span className="font-semibold text-slate-900">Dernière consultation</span> {delai}.{' '}
        <span className="font-semibold text-slate-900">Motif :</span>{' '}
        <span className="text-slate-800">{last.motif || '—'}</span>
      </p>
    </div>
  );
}
