'use client';

import { useMemo } from 'react';
import { Clock4, MapPin, Navigation, Stethoscope } from 'lucide-react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { PUBLIC_CABINET_SWR_KEY, type PublicCabinetBranding } from '@/lib/cabinet-branding';
import { PublicContactStrip } from '@/components/landing/PublicContactStrip';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

function CabinetInfoSkeleton() {
  return (
    <section className="border-t border-slate-200/80 bg-slate-50/80 py-16 sm:py-20" aria-busy="true">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-5 w-40 animate-pulse rounded-full bg-slate-200/80" />
        <div className="mt-4 h-10 w-full max-w-2xl animate-pulse rounded-2xl bg-slate-200/80" />
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="h-[360px] animate-pulse rounded-[32px] bg-white/70" />
          <div className="grid gap-6">
            <div className="h-[170px] animate-pulse rounded-[32px] bg-white/70" />
            <div className="h-[300px] animate-pulse rounded-[32px] bg-white/70" />
          </div>
        </div>
      </div>
    </section>
  );
}

function todayLabel(rows: PublicCabinetBranding['openingHours']) {
  if (!rows.length) return null;
  const today = new Date().getDay();
  const index = today === 0 ? rows.length - 1 : Math.min(today - 1, rows.length - 1);
  return rows[index] ?? rows[0] ?? null;
}

export function CabinetInfoSection() {
  const { data, error } = useSWR<PublicCabinetBranding>(PUBLIC_CABINET_SWR_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  const directionsHref = useMemo(() => {
    if (!data) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${data.address} ${data.cityLine}`
    )}`;
  }, [data]);

  if (error && !data) {
    return (
      <section className="border-t border-slate-200/80 bg-slate-50/80 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
          Impossible de charger les informations du cabinet.
        </div>
      </section>
    );
  }

  if (!data) {
    return <CabinetInfoSkeleton />;
  }

  const CABINET = data;
  const nextOpening = todayLabel(CABINET.openingHours);

  return (
    <section
      className="border-t border-slate-200/80 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_28%,#f8fafc_100%)] py-16 sm:py-20"
      aria-labelledby="cabinet-info-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Informations cabinet
          </p>
          <h2
            id="cabinet-info-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
          >
            Coordonnées, horaires et accès réunis dans un bloc plus lisible
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Retrouvez ici les informations pratiques du cabinet, l’emplacement Google Maps et un accès
            direct vers la réservation.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="space-y-6">
            <article className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Stethoscope className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Cabinet
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                    {CABINET.publicSiteName}
                  </h3>
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {CABINET.publicDoctorDisplayName}
                    {CABINET.publicSpecialty ? ` — ${CABINET.publicSpecialty}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4 rounded-[28px] border border-slate-200/70 bg-slate-50/80 p-5">
                <PublicContactStrip branding={CABINET} />
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                  asChild
                >
                  <a href={directionsHref} target="_blank" rel="noreferrer" className="gap-2">
                    <Navigation className="h-4 w-4" aria-hidden />
                    Voir l’itinéraire
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"
                  asChild
                >
                  <a href="/reservation" className="gap-2">
                    Réserver
                  </a>
                </Button>
              </div>
            </article>
          </div>

          <div className="grid gap-6">
            <article className="rounded-[32px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Clock4 className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                    Horaires
                  </p>
                  <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
                    Ouverture du cabinet
                  </h3>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {CABINET.openingHours.map((row) => (
                  <div
                    key={row.jour}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-700">{row.jour}</span>
                    <span className="text-sm font-semibold text-slate-950">{row.plage}</span>
                  </div>
                ))}
              </div>

              {nextOpening ? (
                <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-900">
                  <span className="font-semibold">Prochaine ligne utile :</span> {nextOpening.jour} —{' '}
                  {nextOpening.plage}
                </div>
              ) : null}
            </article>

            <article className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-200/70 px-6 py-4 sm:px-7">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                  Localisation
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Carte du cabinet</h3>
              </div>
              <div className="relative min-h-[320px] bg-slate-100">
                <iframe
                  title={`Carte Google Maps — ${CABINET.publicSiteName}`}
                  src={CABINET.mapEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
