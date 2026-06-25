import Link from 'next/link';
import { CalendarPlus, Headphones } from 'lucide-react';

import { QueueManager } from '@/components/assistant/QueueManager';
import { RecentlyRegistered } from '@/components/dashboard/RecentlyRegistered';
import { DashboardHero } from '@/components/ui/dashboard-hero';
import { DashboardSection } from '@/components/ui/dashboard-section';
import { Button } from '@/components/ui/button';

export default function AssistantDashboard() {
  return (
    <div className="animate-fade-in space-y-8 pb-8">
      <DashboardHero
        icon={Headphones}
        eyebrow="Accueil"
        title="Espace Accueil"
        description="Gérez la file d'attente, les arrivées patients et les nouveaux rendez-vous."
        actions={
          <Link href="/dashboard/agenda">
            <Button
              size="lg"
              className="gap-2 bg-white text-blue-700 shadow-medical hover:bg-blue-50"
            >
              <CalendarPlus className="h-4 w-4" />
              Nouveau RDV
            </Button>
          </Link>
        }
      />

      <QueueManager />

      <DashboardSection
        title="Actions rapides"
        description="Raccourcis pour les tâches courantes de l'accueil"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-center text-white shadow-medical-blue">
            <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <CalendarPlus className="h-8 w-8" strokeWidth={1.75} aria-hidden />
              </div>
              <h2 className="mb-2 text-xl font-bold">Planifier un rendez-vous</h2>
              <p className="mb-8 max-w-xs text-sm text-blue-100/80">
                Accédez à l&apos;agenda pour une nouvelle prise de rendez-vous ou une urgence.
              </p>
              <Link href="/dashboard/agenda">
                <Button
                  size="lg"
                  className="h-12 bg-white px-8 text-blue-700 hover:bg-blue-50"
                >
                  Ouvrir l&apos;agenda
                </Button>
              </Link>
            </div>
          </div>

          <RecentlyRegistered limit={8} />
        </div>
      </DashboardSection>
    </div>
  );
}
