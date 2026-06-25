'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Home } from 'lucide-react';

import { DailyOverview } from '@/components/dashboard/DailyOverview';
import { DashboardHero } from '@/components/ui/dashboard-hero';

function DashboardHomeContent() {
  const searchParams = useSearchParams();
  const encaisser = searchParams.get('encaisser');

  return (
    <div className="animate-fade-in pb-8">
      <DashboardHero
        icon={Home}
        eyebrow="Tableau de bord"
        title="Accueil"
        description="Vue opérationnelle du jour — priorité aux rendez-vous et à la file d'attente."
      />

      <DailyOverview openEncaissementAppointmentId={encaisser} />
    </div>
  );
}

export default function DashboardHome() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in pb-8">
          <p className="text-sm text-slate-500">Chargement…</p>
        </div>
      }
    >
      <DashboardHomeContent />
    </Suspense>
  );
}
