'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';

import { getPusherClient } from '@/lib/pusher-client';
import { playPatientCallDing } from '@/lib/play-patient-call-ding';
import type { PatientCalledPayload } from '@/lib/patient-call-types';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

/**
 * Écoute `patient-called` sur le canal privé du staff — son + toast accueil.
 */
export function PatientCallListener() {
  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  const { data: me } = useSWR<{ id: string; role: string }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (!useRealtime || !me?.id) return;
    const role = String(me.role).toUpperCase();
    if (role !== 'ASSISTANT' && role !== 'ADMIN') return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-user-${me.id}`;
    const channel = pusher.subscribe(channelName);

    const handler = (payload: PatientCalledPayload) => {
      playPatientCallDing();
      const nomComplet = `${payload.patientPrenom} ${payload.patientNom}`.trim();
      toast.info(`Envoyez ${nomComplet} au bureau du Dr. ${payload.doctorNom}`, {
        duration: 12_000,
        position: 'top-center',
      });
    };

    channel.bind('patient-called', handler);

    return () => {
      channel.unbind('patient-called', handler);
      pusher.unsubscribe(channelName);
    };
  }, [useRealtime, me?.id, me?.role]);

  return null;
}
