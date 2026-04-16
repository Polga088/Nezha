'use client';

import useSWR from 'swr';

import { ChatPanel } from '@/components/chat/ChatPanel';
import { PaymentPendingListener } from '@/components/assistant/PaymentPendingListener';
import { DoctorAssistantSignalListener } from '@/components/doctor/DoctorAssistantSignalListener';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { Sidebar } from '@/components/dashboard/Sidebar';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: me } = useSWR<{ nom?: string; role?: string }>(
    '/api/auth/me',
    fetcher,
    { revalidateOnFocus: true }
  );

  const roleUpper = me ? String(me.role ?? '').toUpperCase() : '';
  const user = me
    ? { nom: me.nom ?? 'Utilisateur', role: String(me.role ?? '') }
    : null;

  const staffBillingAlerts = roleUpper === 'ASSISTANT' || roleUpper === 'ADMIN';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="sticky top-0 z-20 flex h-[min(100dvh,100vh)] shrink-0 flex-col justify-center py-4 pl-4 pr-2">
        <div className="flex h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)] w-[280px] flex-col overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
          <Sidebar />
        </div>
      </div>
      {staffBillingAlerts ? <PaymentPendingListener /> : null}

      <main className="flex min-w-0 flex-1 flex-col bg-slate-50">
        <header className="sticky top-0 z-10 flex h-20 shrink-0 items-center justify-end gap-4 border-0 bg-slate-50 px-6 pr-8 pt-4">
          <NotificationBell />
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800">{user?.nom}</span>
              <span className="text-xs font-light text-slate-500">{user?.role}</span>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-sm">
              {(user?.nom ?? 'U').charAt(0)}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-2">
          <div className="min-h-full rounded-2xl border-0 bg-white p-8 shadow-sm [&_h1]:font-bold [&_h1]:text-slate-800 [&_h2]:font-bold [&_h2]:text-slate-800 [&_h3]:font-bold [&_h3]:text-slate-800">
            {children}
          </div>
        </div>
      </main>
      <ChatPanel />
      <DoctorAssistantSignalListener />
    </div>
  );
}
