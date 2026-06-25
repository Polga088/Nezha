'use client';

import { LayoutDashboard } from 'lucide-react';

import { DailyOverview } from '@/components/dashboard/DailyOverview';
import { DashboardHero } from '@/components/ui/dashboard-hero';

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in pb-8">
      <DashboardHero
        icon={LayoutDashboard}
        eyebrow="Administration"
        title="Vue d'ensemble"
        description="Pilotage du cabinet — rendez-vous, file d'attente et encaissements du jour."
      />

      <DailyOverview />
    </div>
  );
}
