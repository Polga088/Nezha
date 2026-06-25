'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';

import { DailyOverview } from '@/components/dashboard/DailyOverview';
import { ClinicalHero } from '@/components/ui/clinical-hero';
import { MetricCard } from '@/components/ui/metric-card';
import { QuickActionCard } from '@/components/ui/quick-action-card';
import { WorkflowCard } from '@/components/ui/workflow-card';
import { DashboardSection } from '@/components/ui/dashboard-section';

export default function AdminDashboard() {
  return (
    <div className="animate-fade-in space-y-8 pb-8">
      <ClinicalHero
        icon={LayoutDashboard}
        eyebrow="Administration"
        title="Pilotage du cabinet"
        description="Vue d'ensemble de l'activité clinique et financière du jour."
      />

      <DashboardSection title="Indicateurs clés" bento>
        <MetricCard label="Patients" value="—" icon={Users} accent="blue" />
        <MetricCard label="RDV aujourd'hui" value="—" icon={CalendarCheck} accent="cyan" />
        <MetricCard label="Revenus" value="—" icon={Wallet} accent="emerald" />
        <MetricCard label="À encaisser" value="—" icon={AlertTriangle} accent="amber" />
      </DashboardSection>

      <WorkflowCard
        title="Aujourd'hui"
        description="File d'attente, rendez-vous et encaissements du jour"
        icon={CalendarCheck}
        flush
      >
        <div className="p-6">
          <DailyOverview />
        </div>
      </WorkflowCard>

      <DashboardSection title="Actions rapides" description="Raccourcis administration">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            href="/dashboard/patients"
            icon={UserPlus}
            title="Nouveau patient"
            description="Créer un dossier médical"
            accent="blue"
          />
          <QuickActionCard
            href="/dashboard/agenda"
            icon={CalendarCheck}
            title="Agenda"
            description="Gérer les rendez-vous"
            accent="cyan"
          />
          <QuickActionCard
            href="/dashboard/invoices"
            icon={Wallet}
            title="Facturation"
            description="Suivre les paiements"
            accent="emerald"
          />
          <QuickActionCard
            href="/dashboard/admin/analytics"
            icon={BarChart3}
            title="Rapports"
            description="Performance du cabinet"
            accent="amber"
          />
        </div>
      </DashboardSection>

      <WorkflowCard
        title="Alertes administratives"
        description="Points nécessitant votre attention"
        icon={AlertTriangle}
      >
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-10 text-center">
          <p className="text-sm font-medium text-[#172033]">Aucune alerte critique</p>
          <p className="mt-1 text-sm text-[#64748B]">
            Les impayés et anomalies apparaîtront ici.
          </p>
          <Link
            href="/dashboard/invoices"
            className="mt-4 text-sm font-semibold text-[#2563EB] hover:underline"
          >
            Voir la facturation →
          </Link>
        </div>
      </WorkflowCard>
    </div>
  );
}
