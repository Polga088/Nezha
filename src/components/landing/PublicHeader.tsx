import Link from 'next/link';
import { HeartPulse } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { getPublicCabinetBranding } from '@/lib/get-public-cabinet-branding';

/**
 * En-tête landing — logo cabinet (GlobalSettings) et accès équipe discret.
 */
export async function PublicHeader() {
  const branding = await getPublicCabinetBranding();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2.5 sm:gap-3"
          aria-label={`${branding.cabinetName} — accueil`}
        >
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL cabinet dynamique (upload / externe)
            <img
              src={branding.logoUrl}
              alt=""
              className="h-8 w-auto max-w-[140px] object-contain sm:h-9 sm:max-w-[180px]"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/20">
              <HeartPulse className="h-5 w-5" aria-hidden />
            </span>
          )}
          <span className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
            {branding.cabinetName}
          </span>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-800 sm:text-sm"
          asChild
        >
          <Link href="/login" className="gap-1.5">
            Accès staff
          </Link>
        </Button>
      </div>
    </header>
  );
}
