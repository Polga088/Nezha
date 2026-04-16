import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarPlus } from 'lucide-react';

import { QueueManager } from '@/components/assistant/QueueManager';
import { RecentlyRegistered } from '@/components/dashboard/RecentlyRegistered';

export default function AssistantDashboard() {
  return (
    <div className="mx-auto max-w-5xl animate-fade-in space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Espace Accueil</h1>

      <QueueManager />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="flex flex-col items-center justify-center border-0 bg-container-lowest p-10 text-center shadow-medical">
          <div className="mb-6 rounded-full bg-primary/10 p-4 text-primary">
            <CalendarPlus size={40} />
          </div>
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-on-surface">
            Planifier maintenant
          </h2>
          <p className="mb-8 max-w-xs text-on-surface-variant">
            Accédez à l&apos;agenda général pour une nouvelle prise de rendez-vous ou une urgence.
          </p>
          <Link href="/dashboard/agenda">
            <Button size="lg" className="h-14 px-8 text-lg font-semibold">
              Nouveau RDV médical
            </Button>
          </Link>
        </Card>

        <RecentlyRegistered limit={8} />
      </div>
    </div>
  );
}
