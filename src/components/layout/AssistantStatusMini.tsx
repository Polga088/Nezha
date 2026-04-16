'use client';

import { useEffect, useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { Headphones } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { UserStatusType } from '@/lib/user-status';
import { statusDotSolid } from '@/lib/user-status';
import { getPusherClient } from '@/lib/pusher-client';

const ASSISTANT_STATUS_KEY = '/api/users/status/assistant';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

type AssistantPayload = {
  id: string;
  nom: string;
  email: string;
  userStatus: UserStatusType;
  userStatusChangedAt: string;
};

/**
 * Visibilité accueil pour le médecin : nom + pastille, SWR + Pusher `user-status`.
 */
export function AssistantStatusMini({ doctorId }: { doctorId: string }) {
  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  const { data, isLoading } = useSWR<{ assistant: AssistantPayload | null }>(
    ASSISTANT_STATUS_KEY,
    fetcher,
    { refreshInterval: useRealtime ? 0 : 45_000 }
  );

  const assistant = data?.assistant ?? null;
  const assistantIdRef = useRef<string | undefined>(undefined);
  assistantIdRef.current = assistant?.id;

  useEffect(() => {
    if (!useRealtime || !doctorId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `private-user-${doctorId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind(
      'user-status',
      (payload: {
        userId: string;
        userStatus: UserStatusType;
        userStatusChangedAt?: string;
      }) => {
        const aid = assistantIdRef.current;
        if (!aid) {
          globalMutate(ASSISTANT_STATUS_KEY);
          return;
        }
        if (payload.userId !== aid) return;
        globalMutate(
          ASSISTANT_STATUS_KEY,
          (prev: { assistant: AssistantPayload | null } | undefined) => {
            if (!prev?.assistant) return prev;
            return {
              assistant: {
                ...prev.assistant,
                userStatus: payload.userStatus,
                userStatusChangedAt:
                  payload.userStatusChangedAt ?? prev.assistant.userStatusChangedAt,
              },
            };
          },
          { revalidate: false }
        );
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [useRealtime, doctorId]);

  if (isLoading && !data) {
    return (
      <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-500">
        Chargement accueil…
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2 text-[11px] text-slate-500">
        Aucun poste accueil référencé.
      </div>
    );
  }

  const st = assistant.userStatus;

  return (
    <div className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <Headphones className="h-3 w-3" aria-hidden />
        Accueil (temps réel)
      </div>
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'inline-block h-3 w-3 shrink-0 rounded-full ring-2 ring-white shadow-sm',
            statusDotSolid(st)
          )}
          title={st}
          aria-hidden
        />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{assistant.nom}</span>
      </div>
    </div>
  );
}
