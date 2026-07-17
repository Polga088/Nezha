import type { ReactNode } from 'react';
import { ShieldCheck, Phone, Sparkles } from 'lucide-react';

import type { PublicCabinetBranding } from '@/lib/cabinet-branding';

type Props = {
  branding: Pick<
    PublicCabinetBranding,
    | 'publicFeature1Title'
    | 'publicFeature1Description'
    | 'publicFeature2Title'
    | 'publicFeature2Description'
    | 'publicFeature3Title'
    | 'publicFeature3Description'
  >;
};

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
    </article>
  );
}

export function PublicFeatureGrid({ branding }: Props) {
  return (
    <section className="border-b border-slate-200/80 bg-white py-12 sm:py-14 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">
            Repères essentiels
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Une expérience publique plus claire et plus rassurante
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" aria-hidden />}
            title={branding.publicFeature1Title}
            description={branding.publicFeature1Description}
          />
          <FeatureCard
            icon={<Phone className="h-5 w-5" aria-hidden />}
            title={branding.publicFeature2Title}
            description={branding.publicFeature2Description}
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" aria-hidden />}
            title={branding.publicFeature3Title}
            description={branding.publicFeature3Description}
          />
        </div>
      </div>
    </section>
  );
}
