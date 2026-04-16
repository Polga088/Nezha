'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { statusAvatarRing } from '@/lib/user-status';
import type { UserStatusType } from '@/lib/user-status';
import {
  BarChart3,
  CheckSquare,
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

const Icons = {
  Home: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Calendar: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

/**
 * Barre latérale principale du dashboard : navigation + statut temps réel (PATCH + Pusher via API).
 */
export function Sidebar() {
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

  return (
    <aside className={styles.sidebar}>
      <div className="shrink-0 px-3">
        {cabinet?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cabinet.logoUrl}
            alt=""
            className="mb-3 h-10 w-auto max-w-[200px] object-contain object-left"
          />
        ) : null}
        <div className={styles.logo}>{cabinetTitle}</div>
      </div>

      <nav className={styles.nav}>
        <Link
          href="/dashboard"
          className={`${styles.navItem} ${pathname === '/dashboard' ? styles.active : ''}`}
        >
          <Icons.Home /> Accueil
        </Link>
        <Link
          href="/dashboard/agenda"
          className={`${styles.navItem} ${pathname === '/dashboard/agenda' ? styles.active : ''}`}
        >
          <Icons.Calendar /> Agenda & RDV
        </Link>
        <Link
          href="/dashboard/patients"
          className={`${styles.navItem} ${pathname === '/dashboard/patients' ? styles.active : ''}`}
        >
          <Icons.Users /> Patients
        </Link>

        <div className="mt-3 pt-4">
          <p
            className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            aria-hidden
          >
            Tâches personnelles
          </p>
          <Link
            href="/dashboard/todos"
            className={`${styles.navItem} ${pathname.startsWith('/dashboard/todos') ? styles.active : ''}`}
          >
            <span className="inline-flex w-5 shrink-0 justify-center text-slate-600">
              <CheckSquare size={20} strokeWidth={2} aria-hidden />
            </span>
            Tâches
          </Link>
        </div>

        {showAccounting ? (
          <div className="mt-3 space-y-1 pt-4">
            <div
              className="flex items-center gap-2 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              aria-hidden
            >
              <Wallet className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
              Finance
            </div>
            <Link
              href="/dashboard/invoices"
              className={`${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/invoices') ? styles.active : ''}`}
            >
              <span className="inline-flex w-5 shrink-0 justify-center text-slate-500">
                <Receipt size={18} strokeWidth={1.75} aria-hidden />
              </span>
              Revenus
            </Link>
            <Link
              href="/dashboard/admin/expenses"
              className={`${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/expenses') ? styles.active : ''}`}
            >
              <span className="inline-flex w-5 shrink-0 justify-center text-slate-500">
                <Wallet size={18} strokeWidth={1.75} aria-hidden />
              </span>
              Dépenses
            </Link>
            <Link
              href="/dashboard/admin/analytics"
              className={`${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/analytics') ? styles.active : ''}`}
            >
              <span className="inline-flex w-5 shrink-0 justify-center text-slate-500">
                <BarChart3 size={18} strokeWidth={1.75} aria-hidden />
              </span>
              Rapports
            </Link>
          </div>
        ) : null}

        {isAdmin ? (
          <div className="mt-3 space-y-1 pt-4">
            <div
              className="flex items-center gap-2 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              aria-hidden
            >
              <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
              Administration
            </div>
            <Link
              href="/dashboard/admin"
              className={`${styles.navItem} ${styles.navSubItem} ${pathname === '/dashboard/admin' ? styles.active : ''}`}
            >
              <span className="inline-flex w-5 shrink-0 justify-center text-slate-500">
                <LayoutDashboard size={18} strokeWidth={2} aria-hidden />
              </span>
              Vue d&apos;ensemble
            </Link>
            <Link
              href="/dashboard/admin/users"
              className={`${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/users') ? styles.active : ''}`}
            >
              <span className="inline-flex w-5 shrink-0 justify-center text-slate-500">
                <Users size={18} strokeWidth={2} aria-hidden />
              </span>
              Utilisateurs
            </Link>
            <Link
              href="/dashboard/admin/settings"
              className={`${styles.navItem} ${styles.navSubItem} ${pathname.startsWith('/dashboard/admin/settings') ? styles.active : ''}`}
            >
              <span className="inline-flex w-5 shrink-0 justify-center text-slate-500">
                <Settings size={18} strokeWidth={2} aria-hidden />
              </span>
              Paramètres
            </Link>
          </div>
        ) : null}
      </nav>

      <div className="mt-auto flex w-full shrink-0 flex-col gap-4 pt-5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Affichage
          </span>
          <ThemeToggle className="h-9 w-9 shrink-0 border-slate-200 bg-white shadow-sm" />
        </div>
        {isDoctor && me?.id && <AssistantStatusMini doctorId={me.id} />}

        {isStaff && (
          <>
            <div className="flex items-center gap-3 px-1">
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-bold text-white shadow-sm',
                  isDoctor && statusAvatarRing(status)
                )}
                title={`Statut : ${status}`}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{me?.nom ?? '…'}</p>
                <p className="truncate text-xs text-slate-500">{roleLabel(role)}</p>
              </div>
            </div>

            <div className="space-y-1.5 px-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Ma disponibilité
              </p>
              <Select value={status} onValueChange={(v) => patchMyStatus(v as UserStatusType)}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white text-left text-sm shadow-sm">
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
