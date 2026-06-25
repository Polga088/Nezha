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
    <div className="flex min-h-screen bg-[#e8edf5]">
      {/* Sidebar desktop — 280px navy */}
      <div className="sticky top-0 z-30 hidden h-[100dvh] w-[280px] shrink-0 flex-col p-3 lg:flex">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.45)]">
          <Sidebar />
        </div>
      </div>

      {/* Sidebar mobile */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(300px,88vw)] border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      {staffBillingAlerts ? <PaymentPendingListener /> : null}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar glass */}
        <header className="sticky top-0 z-20 flex h-[4.25rem] shrink-0 items-center justify-between gap-4 border-b border-white/60 bg-white/70 px-4 backdrop-blur-2xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden min-w-0 sm:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600/70">
                Nezha Medical
              </p>
              <p className="truncate text-sm font-bold text-slate-800">Espace professionnel</p>
            </div>

            <div className="relative ml-2 hidden max-w-xs flex-1 md:block lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher patient, RDV…"
                className="h-10 border-0 bg-slate-100/80 pl-10 text-sm shadow-none ring-1 ring-slate-900/[0.05] focus-visible:ring-blue-500/30"
                aria-label="Recherche globale"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <NotificationBell />
            <div className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-slate-50 to-white py-1.5 pl-4 pr-1.5 shadow-medical-sm ring-1 ring-slate-900/[0.06]">
              <div className="hidden flex-col items-end leading-tight sm:flex">
                <span className="max-w-[120px] truncate text-sm font-bold text-slate-800">
                  {user?.nom}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600/70">
                  {user?.role}
                </span>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-medical-blue-sm">
                {(user?.nom ?? 'U').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Contenu tonal */}
        <div className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1440px] animate-fade-in">
            {children}
          </div>
        </div>
      </div>

      <ChatPanel />
      <DoctorAssistantSignalListener />
    </div>
  );
}
