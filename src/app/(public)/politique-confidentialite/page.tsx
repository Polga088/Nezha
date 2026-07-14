import type { Metadata } from 'next';
import Link from 'next/link';

import { getPublicCabinetBranding } from '@/lib/get-public-cabinet-branding';
import { ensureGlobalSettings } from '@/lib/global-settings';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getPublicCabinetBranding();
  return {
    title: `Politique de confidentialité — ${branding.cabinetName}`,
  };
}

export default async function PrivacyPolicyPage() {
  const branding = await getPublicCabinetBranding();
  const settings = await ensureGlobalSettings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="clinical-panel space-y-5 p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-slate-900">Politique de confidentialité</h1>
        <p className="text-sm text-slate-600">
          Cette page présente les informations de confidentialité liées au cabinet {branding.cabinetName}.
        </p>
        <div className="space-y-4 text-sm leading-6 text-slate-700">
          <p>
            Les données transmises via le formulaire de réservation servent uniquement à gérer la demande de rendez-vous, la confirmation et l’organisation du cabinet.
          </p>
          <p>
            Pour toute question relative à la confidentialité, vous pouvez contacter le cabinet à l’adresse{' '}
            <span className="font-medium">{settings.cabinetEmail || branding.email || '—'}</span>.
          </p>
          <p>
            Si le cabinet a défini une version spécifique du texte CNDP pour la réservation en ligne, elle est affichée directement sur le formulaire de réservation.
          </p>
        </div>
        <div>
          <Link href="/reservation" className="clinical-button">
            Retour à la réservation
          </Link>
        </div>
      </section>
    </div>
  );
}
