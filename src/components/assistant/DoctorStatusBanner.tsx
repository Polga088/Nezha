'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { differenceInMinutes } from 'date-fns';
import { UserCheck, Clock, ShieldAlert, Loader2, Radio } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserStatusType } from '@/lib/user-status';
import { getPusherClient } from '@/lib/pusher-client';

const DOCTOR_STATUS_KEY = '/api/assistant/doctor-status';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

type DoctorRow = {
  id: string;
  nom: string;
  email: string;
  userStatus: UserStatusType;
  userStatusChangedAt: string;
};

function statusPresentation(s: UserStatusType): {
  label: string;
  Icon: typeof UserCheck;
  bar: string;
  iconWrap: string;
} {
  switch (s) {
    case 'AVAILABLE':
      return {
        label: 'Disponible',
        Icon: UserCheck,
        bar: 'from-emerald-500 to-emerald-600',
        iconWrap: 'bg-emerald-500 text-white shadow-emerald-500/30',
      };
    case 'BUSY':
      return {
        label: 'Occupé',
        Icon: Clock,
        bar: 'from-amber-500 to-amber-600',
        iconWrap: 'bg-amber-500 text-white shadow-amber-500/30',
      };
    case 'AWAY':
      return {
        label: 'Absent',
        Icon: ShieldAlert,
        bar: 'from-rose-500 to-rose-600',
        iconWrap: 'bg-rose-500 text-white shadow-rose-500/30',
      };
    default:
      return {
        label: 'Hors ligne',
        Icon: ShieldAlert,
        bar: 'from-slate-400 to-slate-500',
        iconWrap: 'bg-slate-400 text-white shadow-slate-400/30',
      };
  }
}

/** Texte du type « Occupé depuis 15 min » */
function elapsedLabel(statusLabel: string, iso: string): string {
  const start = new Date(iso);
  const mins = differenceInMinutes(new Date(), start);
  if (mins < 1) return `${statusLabel} — à l’instant`;
  if (mins < 60) return `${statusLabel} depuis ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) {
    return m > 0
      ? `${statusLabel} depuis ${h} h ${m} min`
      : `${statusLabel} depuis ${h} h`;
  }
  const d = Math.floor(h / 24);
  return `${statusLabel} depuis ${d} j`;
}

export function DoctorStatusBanner() {
  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  const { data: me } = useSWR<{ id: string; role: string }>(
    '/api/auth/me',
    fetcher,
    { revalidateOnFocus: true }
  );

  const { data, isLoading } = useSWR<{ doctor: DoctorRow | null }>(
    DOCTOR_STATUS_KEY,
    fetcher,
    { refreshInterval: useRealtime ? 0 : 45_000 }
  );

  const doctor = data?.doctor ?? null;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  /** Temps réel : même canal que la messagerie (`user-status`). */
  useEffect(() => {
    if (!useRealtime || me?.role !== 'ASSISTANT' || !me?.id || !doctor?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-user-${me.id}`);
    const doctorId = doctor.id;

    channel.bind(
      'user-status',
      (payload: {
        userId: string;
        userStatus: UserStatusType;
        userStatusChangedAt?: string;
      }) => {
        if (payload.userId !== doctorId) return;
        globalMutate(
          DOCTOR_STATUS_KEY,
          (prev: { doctor: DoctorRow | null } | undefined) => {
            if (!prev?.doctor || prev.doctor.id !== payload.userId) return prev;
            return {
              doctor: {
                ...prev.doctor,
                userStatus: payload.userStatus,
                userStatusChangedAt:
                  payload.userStatusChangedAt ?? prev.doctor.userStatusChangedAt,
              },
            };
          },
          { revalidate: false }
        );
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${me.id}`);
    };
  }, [useRealtime, me?.role, me?.id, doctor?.id]);

  const presentation = useMemo(
    () => statusPresentation(doctor?.userStatus ?? 'OFFLINE'),
    [doctor?.userStatus]
  );

  const subtitle = useMemo(() => {
    if (!doctor?.userStatusChangedAt) return null;
    return elapsedLabel(
      statusPresentation(doctor.userStatus).label,
      doctor.userStatusChangedAt
    );
  }, [doctor?.userStatus, doctor?.userStatusChangedAt, tick]);

  const [sending, setSending] = useState(false);

  const sendSignal = async () => {
    if (!doctor?.id || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/assistant/doctor-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ doctorId: doctor.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error ?? 'Envoi impossible');
        return;
      }
      toast.success('Signal envoyé au médecin');
    } finally {
      setSending(false);
    }
  };

  if (me?.role !== 'ASSISTANT') return null;

  if (isLoading && !data) {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-outline-variant/15 bg-container-lowest/80 p-4 shadow-medical backdrop-blur-md">
        <Loader2 className="h-5 w-5 animate-spin text-on-surface-variant" />
        <span className="text-sm text-on-surface-variant">Chargement du statut praticien…</span>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mb-6 rounded-xl border border-outline-variant/15 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-medical">
        Aucun médecin actif n’est référencé pour la visibilité temps réel.
      </div>
    );
  }

  const { Icon, bar, iconWrap } = presentation;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-outline-variant/15 bg-container-lowest shadow-medical">
      <div
        className={cn(
          'h-1.5 w-full bg-gradient-to-r',
          bar
        )}
      />
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg',
              iconWrap
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Temps réel — praticien (Pusher)
              </span>
            </div>
            <p className="truncate text-lg font-semibold tracking-tight text-on-surface">{doctor.nom}</p>
            <p className="text-sm font-medium text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100"
          disabled={sending}
          onClick={sendSignal}
        >
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ShieldAlert className="mr-2 h-4 w-4" />
          )}
          Envoyer un signal
        </Button>
      </div>
      <p className="border-t border-outline-variant/15 px-4 py-2 text-[11px] text-on-surface-variant">
        Prévient discrètement le médecin si patient en attente prolongée. Le signal apparaît sur son
        écran (notification + flash).
      </p>
    </div>
  );
}
