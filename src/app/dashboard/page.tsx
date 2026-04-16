'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { DailyOverview } from '@/components/dashboard/DailyOverview';

import styles from './page.module.css';

function DashboardHomeContent() {
  const searchParams = useSearchParams();
  const encaisser = searchParams.get('encaisser');

  return (
    <div className="animate-fade-in space-y-12 pb-8">
      <header className="space-y-2">
        <h1 className={`${styles.sectionTitle} mb-0 text-2xl md:text-3xl`}>
          Accueil
        </h1>
        <p className="max-w-xl text-sm text-slate-600">
          Vue opérationnelle du jour — priorité aux rendez-vous.
        </p>
      </header>

      <div className="w-full max-w-6xl">
        <DailyOverview openEncaissementAppointmentId={encaisser} />
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <Suspense
      fallback={
        <div className="animate-fade-in space-y-12 pb-8">
          <p className="text-sm text-slate-500">Chargement…</p>
        </div>
      }
    >
      <DashboardHomeContent />
    </Suspense>
  );
}
