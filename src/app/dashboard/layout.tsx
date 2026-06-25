'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Menu, Search } from 'lucide-react';

import { ChatPanel } from '@/components/chat/ChatPanel';
import { PaymentPendingListener } from '@/components/assistant/PaymentPendingListener';
import { DoctorAssistantSignalListener } from '@/components/doctor/DoctorAssistantSignalListener';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
    <div className="flex min-h-screen bg-[#F6F8FB]">
      {/* Sidebar desktop — claire 272px */}
      <div className="sticky top-0 z-30 hidden h-[100dvh] w-[272px] shrink-0 border-r border-[#E2E8F0] bg-white lg:flex">
        <Sidebar />
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(288px,90vw)] border-[#E2E8F0] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {staffBillingAlerts ? <PaymentPendingListener /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5 text-[#64748B]" />
            </Button>

            <div className="relative hidden max-w-sm flex-1 md:block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
              <Input
                placeholder="Rechercher patient, RDV…"
                className="h-10 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] pl-10 text-sm"
                aria-label="Recherche globale"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-white py-1.5 pl-3 pr-1.5">
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="max-w-[120px] truncate text-sm font-semibold text-[#172033]">
                  {user?.nom}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                  {user?.role}
                </span>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-bold text-white">
                {(user?.nom ?? 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-[1320px] animate-fade-in">{children}</div>
        </main>
      </div>

      <ChatPanel />
      <DoctorAssistantSignalListener />
    </div>
  );
}
