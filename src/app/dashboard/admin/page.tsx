'use client';

import { DailyOverview } from '@/components/dashboard/DailyOverview';

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in space-y-12 pb-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Vue d&apos;ensemble
        </h1>
        <p className="max-w-xl text-sm text-slate-600">
          Pilotage du jour — rendez-vous et file d&apos;attente.
        </p>
      </header>

      <div className="max-w-5xl">
        <DailyOverview />
      </div>
    </div>
  );
}
