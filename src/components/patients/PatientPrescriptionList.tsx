'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ClipboardList, FileText, Printer, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ShareDocument } from '@/components/patients/ShareDocument';
import { parseMedicamentsJson } from '@/lib/prescription-types';

export type PatientPrescriptionRow = {
  id: string;
  date: string;
  medicaments: unknown;
  conseils: string | null;
  diagnosticAssocie?: string | null;
  sharingToken: string;
  doctor?: { id: string; nom: string; specialite: string | null } | null;
};

type Props = {
  patientId: string;
  prescriptions: PatientPrescriptionRow[];
  patientDisplayName: string;
  onRenew: (row: PatientPrescriptionRow) => void;
};

export function PatientPrescriptionList({
  patientId,
  prescriptions,
  patientDisplayName,
  onRenew,
}: Props) {
  if (prescriptions.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
        Aucune ordonnance enregistrée.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {prescriptions.map((rx) => (
        <li
          key={rx.id}
          className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {format(new Date(rx.date), 'dd MMM yyyy · HH:mm', { locale: fr })}
            </p>
            <p className="text-xs text-slate-500 line-clamp-2">
              {(() => {
                const m = parseMedicamentsJson(rx.medicaments);
                return m?.map((x) => x.nom).join(', ') ?? '—';
              })()}
            </p>
            {rx.doctor?.nom ? (
              <p className="text-[11px] text-sky-700">Dr. réf. : {rx.doctor.nom}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onRenew(rx)}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Renouveler
            </Button>
            <Button type="button" size="sm" variant="default" className="gap-1 bg-sky-600 hover:bg-sky-700" asChild>
              <a
                href={`/dashboard/patients/${patientId}/prescriptions/${rx.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Vue A4
              </a>
            </Button>
            <Button type="button" size="sm" variant="secondary" asChild>
              <a
                href={`/api/prescriptions/${rx.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />
                PDF
              </a>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <a
                href={`/api/prescriptions/${rx.id}/amo-pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ClipboardList className="mr-1 h-3.5 w-3.5" aria-hidden />
                Feuille de soins
              </a>
            </Button>
            <ShareDocument patientName={patientDisplayName} sharingToken={rx.sharingToken} />
          </div>
        </li>
      ))}
    </ul>
  );
}
