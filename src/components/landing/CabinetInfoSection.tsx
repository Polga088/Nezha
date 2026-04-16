'use client';

import { Phone, Mail, Clock, MapPin, Building2 } from 'lucide-react';
import useSWR from 'swr';

import { PUBLIC_CABINET_SWR_KEY, type PublicCabinetBranding } from '@/lib/cabinet-branding';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

function CabinetInfoSkeleton() {
  return (
    <section
      className="border-t border-outline-variant/15 bg-surface py-16 md:py-20"
      aria-busy="true"
      aria-label="Chargement des informations cabinet"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded-md bg-container-high" />
        <div className="mt-4 h-10 w-2/3 max-w-md animate-pulse rounded-md bg-container-high" />
        <div className="mt-8 grid gap-6 lg:grid-cols-3 lg:grid-rows-2">
          <div className="h-64 animate-pulse rounded-xl bg-container-high lg:col-start-1 lg:row-start-1" />
          <div className="h-48 animate-pulse rounded-xl bg-container-high lg:col-start-1 lg:row-start-2" />
          <div className="h-96 animate-pulse rounded-xl bg-container-high lg:col-span-2 lg:row-span-2" />
        </div>
      </div>
    </section>
  );
}

export function CabinetInfoSection() {
  const { data, error } = useSWR<PublicCabinetBranding>(PUBLIC_CABINET_SWR_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  if (error && !data) {
    return (
      <section className="border-t border-outline-variant/15 bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-on-surface-variant">
          Impossible de charger les informations du cabinet.
        </div>
      </section>
    );
  }

  if (!data) {
    return <CabinetInfoSkeleton />;
  }

  const CABINET = data;

  return (
    <section
      className="border-t border-outline-variant/15 bg-surface py-16 md:py-20"
      aria-labelledby="cabinet-info-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            Accès & contact
          </p>
          <h2
            id="cabinet-info-heading"
            className="mt-2 text-3xl font-semibold tracking-tight text-on-surface md:text-4xl"
          >
            Informations cabinet
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-on-surface-variant lg:mx-0">
            Retrouvez nos coordonnées, nos horaires d’ouverture et l’emplacement du cabinet pour planifier
            votre venue en toute sérénité.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:grid-rows-2 lg:gap-6">
          <article className="rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical lg:col-start-1 lg:row-start-1">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Cabinet
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-primary">{CABINET.cabinetName}</h3>
              </div>
            </div>
            <p className="mb-6 text-sm font-medium leading-relaxed text-primary">{CABINET.doctorDisplayName}</p>

            <ul className="space-y-4">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Adresse
                  </p>
                  <p className="text-sm font-medium text-primary">{CABINET.address}</p>
                  <p className="text-sm text-primary">{CABINET.cityLine}</p>
                </div>
              </li>
              <li className="flex gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Téléphone
                  </p>
                  <a
                    href={`tel:${CABINET.phone.replace(/\s/g, '')}`}
                    className="text-sm font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    {CABINET.phone}
                  </a>
                </div>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    Courriel
                  </p>
                  <a
                    href={`mailto:${CABINET.email}`}
                    className="break-all text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {CABINET.email}
                  </a>
                </div>
              </li>
            </ul>
          </article>

          <article className="rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical lg:col-start-1 lg:row-start-2">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Clock className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Horaires
                </p>
                <h3 className="text-lg font-semibold tracking-tight text-on-surface">Ouverture</h3>
              </div>
            </div>
            <ul className="space-y-3">
              {CABINET.openingHours.map((row, idx) => (
                <li
                  key={`${idx}-${row.jour}`}
                  className="flex items-center justify-between gap-4 border-b border-outline-variant/10 pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-on-surface-variant">{row.jour}</span>
                  <span className="text-sm font-semibold tabular-nums text-primary">{row.plage}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-outline-variant/15 bg-container-lowest shadow-medical sm:min-h-[320px] lg:col-span-2 lg:row-span-2 lg:col-start-2 lg:row-start-1 lg:min-h-0">
            <div className="border-b border-outline-variant/15 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Localisation
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">Carte du cabinet</p>
            </div>
            <div className="relative min-h-[240px] flex-1 bg-container-low">
              <iframe
                title={`Carte Google Maps — ${CABINET.cabinetName}`}
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
    </section>
  );
}
