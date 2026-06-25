import Link from 'next/link';
import {
  CalendarPlus,
  CreditCard,
  Headphones,
  UserPlus,
} from 'lucide-react';

import { QueueManager } from '@/components/assistant/QueueManager';
import { RecentlyRegistered } from '@/components/dashboard/RecentlyRegistered';
import { ClinicalHero } from '@/components/ui/clinical-hero';
import { DashboardSection } from '@/components/ui/dashboard-section';
import { QuickActionCard } from '@/components/ui/quick-action-card';
import { WorkflowCard } from '@/components/ui/workflow-card';
import { Button } from '@/components/ui/button';

export default function AssistantDashboard() {
  return (
    <div className="animate-fade-in space-y-8 pb-8">
      <ClinicalHero
        icon={Headphones}
        eyebrow="Accueil"
        title="Espace Accueil"
        description="File d'attente, arrivées patients, paiements et rendez-vous du jour."
        actions={
          <Link href="/dashboard/agenda">
            <Button size="lg" className="gap-2 rounded-xl">
              <CalendarPlus className="h-4 w-4" />
              Nouveau RDV
            </Button>
          </Link>
        }
      />

      <DashboardSection title="Actions rapides" bento>
        <QuickActionCard
          href="/dashboard/patients"
          icon={UserPlus}
          title="Enregistrer patient"
          description="Créer un nouveau dossier"
          accent="blue"
        />
        <QuickActionCard
          href="/dashboard/agenda"
          icon={CalendarPlus}
          title="Créer rendez-vous"
          description="Planifier un créneau"
          accent="cyan"
        />
        <QuickActionCard
          href="/dashboard/invoices"
          icon={CreditCard}
          title="Encaisser"
          description="Paiements en attente"
          accent="emerald"
        />
      </DashboardSection>

      <WorkflowCard
        title="File d'attente"
        description="Patients en attente de passage"
        icon={Headphones}
        flush
      >
        <div className="p-6">
          <QueueManager />
        </div>
      </WorkflowCard>

      <DashboardSection title="Arrivées récentes">
        <RecentlyRegistered limit={8} />
      </DashboardSection>
    </div>
  );
}
