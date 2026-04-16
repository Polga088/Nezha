'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import { getPusherClient } from '@/lib/pusher-client';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

/**
 * Écoute `assistant-signal` sur le canal privé du médecin (`private-user-${me.id}`).
 */
export function DoctorAssistantSignalListener() {
  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  const { data: me } = useSWR<{ id: string; role: string }>(
    '/api/auth/me',
    fetcher,
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    if (!useRealtime || me?.role !== 'DOCTOR' || !me?.id) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-user-${me.id}`;
    const channel = pusher.subscribe(channelName);

    channel.bind(
      'assistant-signal',
      (payload: { assistantName: string; assistantId: string; sentAt: string }) => {
        console.log('SIGNAL REÇU', payload);

        toast.custom(
          () => (
            <div
              className="flex w-full max-w-md items-start gap-3 rounded-xl border border-blue-400/90 bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-3.5 text-white shadow-lg shadow-blue-900/25"
              role="status"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                <Bell className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold tracking-tight">Signal accueil</p>
                <p className="mt-1 text-sm font-medium text-blue-50">
                  {payload.assistantName} signale une attente en salle d’attente.
                </p>
              </div>
            </div>
          ),
          { duration: 8000 }
        );
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [useRealtime, me?.role, me?.id]);

  return null;
}
