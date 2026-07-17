import Link from 'next/link';
import { CalendarDays, HeartPulse } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getPublicCabinetBranding } from '@/lib/get-public-cabinet-branding';

/**
 * En-tête public premium — lisible sur tous les fonds du hero.
 */
export async function PublicHeader() {
  const branding = await getPublicCabinetBranding();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/78 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/68">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 rounded-full pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
          aria-label={`${branding.publicSiteName} — accueil`}
        >
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo cabinet dynamique
            <img
              src={branding.logoUrl}
              alt=""
              className="h-9 w-auto max-w-[180px] object-contain sm:h-10 sm:max-w-[220px]"
            />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.22)]">
              <HeartPulse className="h-5 w-5" aria-hidden />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold tracking-tight text-slate-950 sm:text-base">
              {branding.publicSiteName}
            </span>
            <span className="block text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
              Cabinet médical
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:px-4"
            asChild
          >
            <Link href="/login">
              <span className="sm:hidden">Staff</span>
              <span className="hidden sm:inline">Accès staff</span>
            </Link>
          </Button>
          <Button
            size="sm"
            className="h-10 rounded-full bg-gradient-to-b from-blue-600 to-blue-700 px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(37,99,235,0.26)] sm:px-5"
            asChild
          >
            <Link href="/reservation" className="gap-2">
              <CalendarDays className="h-4 w-4" aria-hidden />
              <span>Réserver</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
