'use client';

import { LayoutDashboard } from 'lucide-react';

import { DailyOverview } from '@/components/dashboard/DailyOverview';
import { PageHeader } from '@/components/ui/page-header';

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in pb-8">
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Administration"
        title="Vue d'ensemble"
        description="Pilotage du jour — rendez-vous et file d'attente."
      />

      <div className="max-w-5xl">
        <DailyOverview />
      </div>
    </div>
  );
}
