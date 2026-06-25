'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { statusAvatarRing } from '@/lib/user-status';
import type { UserStatusType } from '@/lib/user-status';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

import { performClientLogout } from '@/components/auth/LogoutLink';
import { ThemeToggle } from '@/components/theme-toggle';
import { AssistantStatusMini } from '@/components/layout/AssistantStatusMini';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import styles from '@/app/dashboard/dashboard.module.css';
import { PUBLIC_CABINET_SWR_KEY, type PublicCabinetBranding } from '@/lib/cabinet-branding';

const ME_KEY = '/api/auth/me';
const CONTACTS_KEY = '/api/chat/contacts';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const STAFF_ROLES = new Set(['ADMIN', 'DOCTOR', 'ASSISTANT']);

function roleLabel(role: string): string {
  switch (role?.toUpperCase()) {
    case 'ADMIN':
      return 'Administrateur';
    case 'DOCTOR':
      return 'Médecin';
    case 'ASSISTANT':
      return 'Accueil';
    default:
      return role;
  }
}

type SidebarProps = {
  onNavigate?: () => void;
};

/**
 * Barre latérale principale du dashboard : navigation + statut temps réel (PATCH + Pusher via API).
 */
export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();

  const { data: me } = useSWR<{
    id: string;
    nom: string;
    role: string;
    userStatus?: UserStatusType;
  }>(ME_KEY, fetcher, { revalidateOnFocus: true });

  const { data: cabinet } = useSWR<PublicCabinetBranding>(PUBLIC_CABINET_SWR_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  const role = me?.role ? String(me.role).toUpperCase() : '';
  const isStaff = STAFF_ROLES.has(role);
  const status = (me?.userStatus ?? 'OFFLINE') as UserStatusType;
  const isDoctor = role === 'DOCTOR';
  const isAdmin = role === 'ADMIN';
  const showAccounting = isAdmin || isDoctor;

  const patchMyStatus = async (userStatus: UserStatusType) => {
    const res = await fetch('/api/users/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ userStatus }),
    });
    if (!res.ok) {
      toast.error('Impossible de mettre à jour le statut');
      return;
    }
    await globalMutate(ME_KEY);
    await globalMutate(CONTACTS_KEY);
  };

  const initial = (me?.nom?.trim().charAt(0) || 'U').toUpperCase();

  const cabinetTitle = cabinet?.cabinetName ?? 'Nezha Medical';

  const handleLogout = async () => {
    try {
      await performClientLogout();
      toast.success('Déconnexion réussie');
      window.location.href = '/login';
    } catch {
      toast.error('Impossible de se déconnecter.');
    }
  };

  const navLink = (href: string, className: string, children: React.ReactNode) => (
    <Link href={href} className={className} onClick={onNavigate}>
      {children}
    </Link>
  );

  return (
    <aside className={styles.sidebar}>
      <div className="shrink-0 px-1">
        {cabinet?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cabinet.logoUrl}
            alt=""
            className="mb-3 h-9 w-auto max-w-[180px] object-contain object-left brightness-0 invert"
          />
        ) : (
          <div className="clinical-sidebar-brand mb-1">
            <span className="clinical-sidebar-brand-icon">
              <LayoutDashboard className="h-5 w-5" strokeWidth={2} aria-hidden />
            </span>
          </div>
        )}
        <div className={styles.logo}>{cabinetTitle}</div>
        <p className={styles.logoSub}>Cabinet médical</p>
      </div>

      <nav className={styles.nav}>
        {navLink(
          '/dashboard',
          `${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`,
          <>
            <span className="inline-flex w-5 shrink-0 justify-center">
              <Home size={18} strokeWidth={2} aria-hidden />
            </span>
            Accueil
          </>
        )}
        {navLink(
          '/dashboard/agenda',
          `${styles.navItem} ${pathname === '/dashboard/agenda' ? styles.active : ''}`,
          <>
            <span className="inline-flex w-5 shrink-0 justify-center">
              <CalendarDays size={18} strokeWidth={2} aria-hidden />
            </span>
            Agenda &amp; RDV
          </>
        )}
        {navLink(
          '/dashboard/patients',
          `${styles.navItem} ${pathname === '/dashboard/patients' ? styles.active : ''}`,
          <>
            <span className="inline-flex w-5 shrink-0 justify-center">
              <Users size={18} strokeWidth={2} aria-hidden />
            </span>
            Patients
          </>
        )}

        <div className={styles.navSection}>
          <p className={styles.navSectionLabel} aria-hidden>
            Tâches
          </p>
          {navLink(
            '/dashboard/todos',
            `${styles.navItem} ${pathname.startsWith('/dashboard/todos') ? styles.active : ''}`,
            <>
              <span className="inline-flex w-5 shrink-0 justify-center">
                <CheckSquare size={18} strokeWidth={2} aria-hidden />
              </span>
              Tâches
            </>
          )}
        </div>

        {showAccounting ? (
          <div className={`${styles.navSection} space-y-1`}>
            <div className={styles.navSectionLabel} aria-hidden>
              <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
              Finance
            </div>
            {navLink(
              '/dashboard/invoices',
              `${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/invoices') ? styles.active : ''}`,
              <>
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <Receipt size={16} strokeWidth={1.75} aria-hidden />
                </span>
                Revenus
              </>
            )}
            {navLink(
              '/dashboard/admin/expenses',
              `${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/expenses') ? styles.active : ''}`,
              <>
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <Wallet size={16} strokeWidth={1.75} aria-hidden />
                </span>
                Dépenses
              </>
            )}
            {navLink(
              '/dashboard/admin/analytics',
              `${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/analytics') ? styles.active : ''}`,
              <>
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <BarChart3 size={16} strokeWidth={1.75} aria-hidden />
                </span>
                Rapports
              </>
            )}
          </div>
        ) : null}

        {isAdmin ? (
          <div className={`${styles.navSection} space-y-1`}>
            <div className={styles.navSectionLabel} aria-hidden>
              <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={2} />
              Administration
            </div>
            {navLink(
              '/dashboard/admin',
              `${styles.navItem} ${styles.navSubItem} ${pathname === '/dashboard/admin' ? styles.active : ''}`,
              <>
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <LayoutDashboard size={16} strokeWidth={2} aria-hidden />
                </span>
                Vue d&apos;ensemble
              </>
            )}
            {navLink(
              '/dashboard/admin/users',
              `${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/users') ? styles.active : ''}`,
              <>
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <Users size={16} strokeWidth={2} aria-hidden />
                </span>
                Utilisateurs
              </>
            )}
            {navLink(
              '/dashboard/admin/settings',
              `${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/settings') ? styles.active : ''}`,
              <>
                <span className="inline-flex w-5 shrink-0 justify-center">
                  <Settings size={16} strokeWidth={2} aria-hidden />
                </span>
                Paramètres
              </>
            )}
          </div>
        ) : null}
      </nav>

      <div className="mt-auto flex w-full shrink-0 flex-col gap-4 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Affichage
          </span>
          <ThemeToggle className="h-9 w-9 shrink-0 border-white/10 bg-white/5 text-slate-300 shadow-none hover:bg-white/10" />
        </div>
        {isDoctor && me?.id && <AssistantStatusMini doctorId={me.id} />}

        {isStaff && (
          <>
            <div className="flex items-center gap-3 px-1">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 text-sm font-bold text-white shadow-medical-blue-sm',
                  isDoctor && statusAvatarRing(status)
                )}
                title={`Statut : ${status}`}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{me?.nom ?? '…'}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel(role)}</p>
              </div>
            </div>

            <div className="space-y-1.5 px-0.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Ma disponibilité
              </p>
              <Select value={status} onValueChange={(v) => patchMyStatus(v as UserStatusType)}>
                <SelectTrigger className="h-10 w-full border-white/10 bg-white/5 text-left text-sm text-slate-200 shadow-none">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Disponible</SelectItem>
                  <SelectItem value="BUSY">Occupé</SelectItem>
                  <SelectItem value="AWAY">Absent</SelectItem>
                  <SelectItem value="OFFLINE">Hors ligne</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <button
          type="button"
          className={styles.logoutBtn}
          onClick={() => void handleLogout()}
        >
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
