import type { Metadata } from 'next';

import { PublicHero } from '@/components/landing/PublicHero';
import { PublicVerificationSection } from '@/components/landing/PublicVerificationSection';
import { CabinetInfoSection } from '@/components/landing/CabinetInfoSection';
import { getPublicCabinetBranding } from '@/lib/get-public-cabinet-branding';

export async function generateMetadata(): Promise<Metadata> {
  const b = await getPublicCabinetBranding();
  return {
    title: `${b.cabinetName} — Accueil`,
    description: `Cabinet médical ${b.cabinetName} — ${b.doctorDisplayName}. Contact, horaires et vérification de documents.`,
  };
}

export default async function LandingPage() {
  const branding = await getPublicCabinetBranding();

  return (
    <>
      <PublicHero branding={branding} />
      <PublicVerificationSection />
      <div id="infos-cabinet" className="scroll-mt-20">
        <CabinetInfoSection />
      </div>
    </>
  );
}
