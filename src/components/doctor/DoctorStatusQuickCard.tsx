'use client';

import React, { useEffect, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import {
  Coffee,
  Loader2,
  LogOut,
  Stethoscope,
  UserCheck,
  UserX,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DOCTOR_QUICK_STATUSES,
  statusPresentation,
  type UserStatusType,
} from '@/lib/user-status';
import { getPusherClient } from '@/lib/pusher-client';

const ME_KEY = '/api/auth/me';
const STATUS_KEY = '/api/doctor/status';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

const STATUS_ICONS: Partial<Record<UserStatusType, typeof UserCheck>> = {
  AVAILABLE: UserCheck,
  BUSY: Stethoscope,
  IN_CONSULTATION: Stethoscope,
  ON_BREAK: Coffee,
  AWAY: UserX,
  DONE_TODAY: LogOut,
};

type DoctorStatusRow = {
  effectiveStatus: UserStatusType;
  userStatus: UserStatusType;
  canReceivePatient: boolean;
  inConsultation: boolean;
  inConsultationPatient?: { prenom: string; nom: string } | null;
};

/** Changement rapide de disponibilité médecin (persisté + temps réel Pusher). */
export function DoctorStatusQuickCard({ className }: { className?: string }) {
  const { data: me } = useSWR<{ id: string; role: string }>(ME_KEY, fetcher);
  const { data, error, isLoading, mutate } = useSWR<{ doctor: DoctorStatusRow }>(
    STATUS_KEY,
    fetcher,
    { refreshInterval: 20_000, revalidateOnFocus: true }
  );

  const doctor = data?.doctor;
  const effective = doctor?.effectiveStatus ?? 'OFFLINE';
  const presentation = statusPresentation(effective);
  const [patching, setPatching] = useState<UserStatusType | null>(null);

  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  useEffect(() => {
    if (!useRealtime || !me?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(`private-user-${me.id}`);
    channel.bind('user-status', () => {
      void mutate();
      void globalMutate(ME_KEY);
    });
    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${me.id}`);
    };
  }, [useRealtime, me?.id, mutate]);

  const patchStatus = async (userStatus: UserStatusType) => {
    if (doctor?.inConsultation && userStatus !== 'IN_CONSULTATION') {
      toast.message('Consultation en cours', {
        description: 'Clôturez la consultation avant de changer de statut.',
      });
      return;
    }
    setPatching(userStatus);
    try {
      const res = await fetch('/api/users/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ userStatus }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Mise à jour impossible');
        return;
      }
      toast.success('Statut mis à jour');
      await mutate();
      await globalMutate(ME_KEY);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setPatching(null);
    }
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm',
        className
      )}
    >
      <div className={cn('h-1 w-full bg-gradient-to-r', presentation.bar)} />
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
              Ma disponibilité
            </p>
            <p className="mt-1 text-lg font-bold text-[#172033]">{presentation.label}</p>
            {doctor?.inConsultationPatient ? (
              <p className="mt-1 text-sm text-[#64748B]">
                Patient : {doctor.inConsultationPatient.prenom} {doctor.inConsultationPatient.nom}
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
              presentation.badge
            )}
          >
            {doctor?.canReceivePatient ? 'Peut recevoir' : 'Indisponible'}
          </span>
        </div>

        {error ? <p className="mb-3 text-sm text-red-600">{String(error.message)}</p> : null}

        {isLoading && !data ? (
          <div className="flex items-center gap-2 py-4 text-sm text-[#64748B]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DOCTOR_QUICK_STATUSES.map((st) => {
              const Icon = STATUS_ICONS[st] ?? UserCheck;
              const active = effective === st;
              const p = statusPresentation(st);
              return (
                <Button
                  key={st}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  size="sm"
                  disabled={patching !== null}
                  className={cn(
                    'h-auto flex-col gap-1 py-2.5 text-xs',
                    !active && 'border-[#E2E8F0] bg-[#F8FAFC] text-[#172033] hover:bg-[#EFF6FF]'
                  )}
                  onClick={() => void patchStatus(st)}
                >
                  {patching === st ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  {p.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
