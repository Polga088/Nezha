import Link from 'next/link';
import { CalendarDays, ChevronRight, Clock3, MapPin, Phone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PublicCabinetBranding } from '@/lib/cabinet-branding';
import { PublicHeroBackground } from '@/components/landing/PublicHeroBackground';
import { PublicContactStrip } from '@/components/landing/PublicContactStrip';

type Props = {
  branding: PublicCabinetBranding;
};

function formatOpeningHours(rows: PublicCabinetBranding['openingHours']) {
  return rows.slice(0, 2).map((row) => `${row.jour} · ${row.plage}`);
}

export function PublicHero({ branding }: Props) {
  const directionsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${branding.address} ${branding.cityLine}`
  )}`;
  const openingHours = formatOpeningHours(branding.openingHours);

  return (
    <section
      className="relative overflow-hidden border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_55%,#f8fafc_100%)]"
      aria-labelledby="public-hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_30%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="order-1 space-y-6 text-left lg:py-6">
            <div className="inline-flex max-w-full items-center rounded-full border border-blue-200/70 bg-blue-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700 shadow-sm backdrop-blur-sm">
              {branding.publicHeroEyebrow}
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
                {branding.publicDoctorDisplayName}
              </p>
              <h1
                id="public-hero-heading"
                className="max-w-4xl text-balance font-serif text-[2.35rem] font-semibold leading-[0.95] tracking-tight text-slate-950 sm:text-[3.15rem] md:text-[4rem] lg:text-[4.6rem]"
              >
                {branding.publicSiteName}
              </h1>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3.5 py-2 text-sm font-semibold text-emerald-800 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {branding.publicSpecialty}
              </div>
            </div>

            <p className="max-w-[36rem] text-pretty text-base leading-7 text-slate-600 sm:text-[1.05rem]">
              {branding.publicHeroDescription}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                size="lg"
                className="h-12 rounded-full bg-gradient-to-b from-blue-600 to-blue-700 px-6 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(37,99,235,0.24)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(37,99,235,0.28)] sm:px-7"
                asChild
              >
                <Link href="/reservation" className="gap-2">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {branding.publicPrimaryButtonLabel}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-slate-200 bg-white/80 px-6 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white sm:px-7"
                asChild
              >
                <Link href="#infos-cabinet" className="gap-2">
                  {branding.publicSecondaryButtonLabel}
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>

            <PublicContactStrip branding={branding} className="max-w-3xl" />

            <div className="flex flex-wrap items-center gap-4 pt-1 text-sm text-slate-500">
              <a
                href="#verification-documents"
                className="inline-flex items-center gap-2 font-medium text-slate-600 transition hover:text-blue-700"
              >
                <span>Vérifier un document</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </a>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-flex" aria-hidden />
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-medium text-slate-600 transition hover:text-blue-700"
              >
                <MapPin className="h-4 w-4" aria-hidden />
                Voir l’itinéraire
              </a>
            </div>
          </div>

          <div className="order-2 lg:py-6">
            <div className="relative overflow-visible">
              <div className="relative min-h-[340px] overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] sm:min-h-[440px] lg:min-h-[620px]">
                <PublicHeroBackground
                  mode={branding.publicHeroBackgroundMode}
                  gradientFrom={branding.publicHeroBackgroundGradientFrom}
                  gradientTo={branding.publicHeroBackgroundGradientTo}
                  gradientDirection={branding.publicHeroBackgroundGradientDirection}
                  imageUrl={branding.publicHeroBackgroundImageUrl}
                  overlay={branding.publicHeroBackgroundOverlay}
                  sliderIntervalMs={branding.publicHeroBackgroundSliderIntervalMs}
                  slides={branding.publicHeroSlides}
                  showControls
                />

                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.08)_45%,rgba(15,23,42,0.12)_100%)]" />

                <div className="absolute inset-x-4 bottom-4 z-20 hidden md:block">
                  <div className="grid gap-4 rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.12)] backdrop-blur-xl lg:grid-cols-[1fr_auto] lg:items-end">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <Clock3 className="h-4 w-4" aria-hidden />
                        </span>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                            Cabinet
                          </p>
                          <p className="text-sm font-semibold tracking-tight text-slate-900">
                            {branding.address}
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        {openingHours.map((row) => (
                          <div key={row} className="rounded-2xl bg-slate-50 px-3 py-2">
                            {row}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="h-11 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800"
                      asChild
                    >
                      <Link href="/reservation" className="gap-2">
                        <Phone className="h-4 w-4" aria-hidden />
                        Réserver
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-6 -top-6 hidden h-24 w-24 rounded-full border border-blue-100 bg-blue-50/60 blur-[1px] lg:block" />
              <div className="pointer-events-none absolute -bottom-4 -left-5 hidden h-20 w-20 rounded-full border border-emerald-100 bg-emerald-50/70 blur-[1px] lg:block" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
