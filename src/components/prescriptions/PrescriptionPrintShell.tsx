'use client';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Printer } from 'lucide-react';

import type { MedicamentLine } from '@/lib/prescription-types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PrescriptionPrintData = {
  patientPrenom: string;
  patientNom: string;
  patientDateNaissance: string;
  dateOrdonnance: string;
  medicaments: MedicamentLine[];
  diagnosticAssocie: string | null;
  conseils: string | null;
  cabinetName: string;
  doctorLine: string;
  doctorSpecialty: string | null;
  cabinetPhone: string;
  cabinetAddress: string;
  inpe: string | null;
  logoUrl: string | null;
  ustMarkSrc: string;
};

export function PrescriptionPrintShell({ data }: { data: PrescriptionPrintData }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl px-4 py-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Aperçu avant impression — format A4, une page conseillée.
          </p>
          <Button
            type="button"
            onClick={handlePrint}
            className="gap-2 bg-gradient-to-b from-sky-500 to-sky-600"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Imprimer (A4)
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] text-slate-900 shadow-sm print:shadow-none',
          'print:mx-0 print:max-w-none print:min-h-0 print:p-0 print:px-[14mm] print:py-[12mm]'
        )}
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-sky-100 pb-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt=""
                className="h-14 w-auto max-w-[120px] object-contain object-left"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-lg font-bold tracking-tight text-sky-950">{data.cabinetName}</p>
              {data.doctorSpecialty ? (
                <p className="text-xs text-slate-600">{data.doctorSpecialty}</p>
              ) : null}
              {data.cabinetPhone ? (
                <p className="text-xs text-slate-600">Tél. {data.cabinetPhone}</p>
              ) : null}
              {data.cabinetAddress ? (
                <p className="whitespace-pre-line text-xs text-slate-600">{data.cabinetAddress}</p>
              ) : null}
              {data.inpe ? (
                <p className="text-xs text-slate-500">INPE : {data.inpe}</p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.ustMarkSrc}
              alt="UST · Nezha"
              className="h-10 w-auto object-contain"
            />
          </div>
        </header>

        <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">ORDONNANCE</h1>
          <p className="text-sm text-slate-600">
            {format(new Date(data.dateOrdonnance), "d MMMM yyyy", { locale: fr })}
          </p>
        </div>

        <section className="mt-5">
          <h2 className="text-xs font-bold uppercase tracking-wide text-sky-800">Patient</h2>
          <p className="mt-1 text-sm font-semibold">
            {data.patientPrenom} {data.patientNom.toUpperCase()}
          </p>
          <p className="text-xs text-slate-600">
            Né(e) le :{' '}
            {format(new Date(data.patientDateNaissance), 'd MMMM yyyy', { locale: fr })}
          </p>
        </section>

        {data.diagnosticAssocie?.trim() ? (
          <section className="mt-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-sky-800">
              Diagnostic associé
            </h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
              {data.diagnosticAssocie.trim()}
            </p>
          </section>
        ) : null}

        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-sky-800">Prescription</h2>
          <ul className="mt-3 space-y-4">
            {data.medicaments.map((m, i) => (
              <li key={`${m.nom}-${i}`} className="border-l-2 border-sky-200 pl-3">
                <p className="font-semibold text-slate-900">
                  {i + 1}. {m.nom}
                  {m.dosage?.trim() ? (
                    <span className="font-normal text-slate-600"> — {m.dosage.trim()}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-slate-700">Posologie : {m.posologie}</p>
                {m.duree?.trim() ? (
                  <p className="text-xs text-slate-600">Durée : {m.duree.trim()}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {data.conseils?.trim() ? (
          <section className="mt-6">
            <h2 className="text-xs font-bold uppercase tracking-wide text-sky-800">Conseils</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{data.conseils.trim()}</p>
          </section>
        ) : null}

        <footer className="mt-auto pt-16 print:pt-20">
          <div className="flex flex-col items-end gap-1 border-t border-slate-200 pt-6">
            <p className="text-sm font-semibold text-slate-900">{data.doctorLine}</p>
            <p className="text-xs text-slate-500">Signature et cachet</p>
            <div className="mt-6 h-16 w-48 border-b border-slate-300" aria-hidden />
          </div>
        </footer>
      </div>
    </div>
  );
}
