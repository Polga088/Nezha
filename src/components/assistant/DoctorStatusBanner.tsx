'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { differenceInMinutes } from 'date-fns';
import { Loader2, Radio, ShieldAlert, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  statusPresentation,
  type UserStatusType,
} from '@/lib/user-status';
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
  effectiveStatus: UserStatusType;
  userStatusChangedAt: string;
  effectiveStatusChangedAt: string;
  canReceivePatient: boolean;
  inConsultation: boolean;
  inConsultationPatient?: { prenom: string; nom: string } | null;
};

function elapsedLabel(statusLabel: string, iso: string): string {
  const mins = differenceInMinutes(new Date(), new Date(iso));
  if (mins < 1) return `${statusLabel} — à l’instant`;
  if (mins < 60) return `${statusLabel} depuis ${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${statusLabel} depuis ${h} h ${m} min` : `${statusLabel} depuis ${h} h`;
  return `${statusLabel} depuis ${Math.floor(h / 24)} j`;
}

export function DoctorStatusBanner() {
  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  const { data: me } = useSWR<{ id: string; role: string }>('/api/auth/me', fetcher, {
    revalidateOnFocus: true,
  });

  const { data, isLoading, mutate } = useSWR<{ doctor: DoctorRow | null }>(
    DOCTOR_STATUS_KEY,
    fetcher,
    { refreshInterval: useRealtime ? 0 : 30_000 }
  );

  const doctor = data?.doctor ?? null;
  const [tick, setTick] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!useRealtime || me?.role !== 'ASSISTANT' || !me?.id || !doctor?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-user-${me.id}`);
    const doctorId = doctor.id;

    channel.bind(
      'user-status',
      (payload: { userId: string; userStatus: UserStatusType; userStatusChangedAt?: string }) => {
        if (payload.userId !== doctorId) return;
        void mutate();
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${me.id}`);
    };
  }, [useRealtime, me?.role, me?.id, doctor?.id, mutate]);

  const effective = doctor?.effectiveStatus ?? 'OFFLINE';
  const presentation = useMemo(() => statusPresentation(effective), [effective]);

  const subtitle = useMemo(() => {
    void tick;
    if (!doctor?.effectiveStatusChangedAt) return null;
    return elapsedLabel(presentation.label, doctor.effectiveStatusChangedAt);
  }, [doctor?.effectiveStatusChangedAt, presentation.label, tick]);

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
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <Loader2 className="h-5 w-5 animate-spin text-[#64748B]" />
        <span className="text-sm text-[#64748B]">Chargement du statut praticien…</span>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Aucun médecin actif n’est référencé pour la visibilité temps réel.
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
      <div className={cn('h-1.5 w-full bg-gradient-to-r', presentation.bar)} />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-md',
              presentation.iconWrap
            )}
          >
            <UserCheck className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Radio className="h-3.5 w-3.5 text-[#64748B]" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                Statut praticien
              </span>
              <span
                className={cn(
                  'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                  presentation.badge
                )}
              >
                {presentation.label}
              </span>
            </div>
            <p className="truncate text-lg font-semibold text-[#172033]">{doctor.nom}</p>
            <p className="text-sm text-[#64748B]">{subtitle}</p>
            {doctor.inConsultationPatient ? (
              <p className="text-sm font-medium text-blue-700">
                En consultation : {doctor.inConsultationPatient.prenom}{' '}
                {doctor.inConsultationPatient.nom}
              </p>
            ) : null}
            <p className="text-xs font-medium text-[#64748B]">
              {doctor.canReceivePatient ?
                '✓ Le médecin peut recevoir un patient'
              : '✗ Patient non recevable pour le moment'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 border-rose-200 bg-rose-50/80 text-rose-800 hover:bg-rose-100"
          disabled={sending || doctor.canReceivePatient}
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
      <p className="border-t border-[#E2E8F0] px-5 py-2 text-[11px] text-[#64748B]">
        Signal discret si attente prolongée — notification sur l’écran du médecin.
      </p>
    </div>
  );
}
