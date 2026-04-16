import Link from 'next/link';
import { ArrowDown, Phone, Mail, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { PublicCabinetBranding } from '@/lib/cabinet-branding';

type Props = {
  branding: PublicCabinetBranding;
};

/**
 * Hero landing — flous, typographie calme, données `GlobalSettings` (nom cabinet, praticien).
 */
export function PublicHero({ branding }: Props) {
  const telHref = `tel:${branding.phone.replace(/\s/g, '')}`;

  return (
    <section
      className="relative overflow-hidden border-b border-slate-200/40"
      aria-labelledby="public-hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-slate-50/90" />
      <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-blue-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[380px] w-[380px] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-10 text-center sm:px-6 sm:pb-20 sm:pt-14 md:px-8">
        <div className="mx-auto inline-flex max-w-full items-center justify-center rounded-2xl border border-white/80 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-md sm:px-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 sm:text-sm">
            Soins &amp; accompagnement
          </p>
        </div>

        <h1
          id="public-hero-heading"
          className="mt-8 text-balance font-serif text-4xl font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl md:text-[3.25rem]"
        >
          <span className="block text-lg font-normal leading-snug text-slate-600 sm:text-xl md:text-2xl">
            {branding.doctorDisplayName}
          </span>
          <span className="mt-3 block bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
            {branding.cabinetName}
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
          Un cabinet à votre écoute : rendez-vous, suivi et documents sécurisés. Retrouvez nos coordonnées
          ci-dessous ou vérifiez un document médical avec le code reçu par votre praticien.
        </p>

        {/* Accès rapide mobile : contact */}
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center">
          <a
            href={telHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:border-blue-200 hover:bg-white sm:min-w-[200px]"
          >
            <Phone className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            <span className="tabular-nums">{branding.phone}</span>
          </a>
          <a
            href={`mailto:${branding.email}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-sm transition hover:border-blue-200 hover:bg-white sm:min-w-[200px]"
          >
            <Mail className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
            <span className="max-w-[220px] truncate sm:max-w-none">{branding.email}</span>
          </a>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row sm:gap-4">
          <Button
            size="lg"
            className="h-12 w-full rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 px-8 text-base font-semibold shadow-lg shadow-blue-500/25 sm:w-auto sm:min-w-[200px]"
            asChild
          >
            <Link href="#verification-documents">Saisir un code document</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 w-full rounded-xl border-slate-200 bg-white/60 backdrop-blur-sm sm:w-auto"
            asChild
          >
            <Link href="#infos-cabinet">Adresse &amp; horaires</Link>
          </Button>
        </div>

        <div className="mt-12 flex justify-center sm:mt-14">
          <a
            href="#verification-documents"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-700"
          >
            <span>Vérifier sans QR code</span>
            <ArrowDown className="h-4 w-4 animate-bounce" aria-hidden />
          </a>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl gap-4 text-left sm:grid-cols-3 sm:gap-5">
          <div className="rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md sm:p-5">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100/80 text-blue-700">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-slate-900">Données protégées</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Accès aux documents après vérification d&apos;identité.
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md sm:p-5">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100/80 text-emerald-700">
              <Phone className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-slate-900">Contact direct</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Appelez-nous pour un rendez-vous ou une question.
            </p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm backdrop-blur-md sm:col-span-1 sm:p-5 lg:col-span-1">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100/80 text-violet-700">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-semibold text-slate-900">À votre rythme</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Toutes les infos utiles en bas de page.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
