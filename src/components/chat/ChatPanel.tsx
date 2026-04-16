'use client';

/**
 * Messagerie interne — temps réel via Pusher (canal `private-user-{id}`).
 * Le statut (AVAILABLE, etc.) est géré dans la Sidebar ; le chat reste utilisable quel que soit le statut.
 * Repli : polling ~10s si `NEXT_PUBLIC_PUSHER_KEY` est absent.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { UserStatusType } from '@/lib/user-status';
import { getPusherClient } from '@/lib/pusher-client';

export type { UserStatusType } from '@/lib/user-status';

const CONTACTS_KEY = '/api/chat/contacts';
const UNREAD_KEY = '/api/chat/unread';
const ME_KEY = '/api/auth/me';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

function messagesKey(peerId: string | null) {
  return peerId
    ? `/api/chat/messages?peerId=${encodeURIComponent(peerId)}`
    : null;
}

type Contact = {
  id: string;
  nom: string;
  email: string;
  role: string;
  userStatus: UserStatusType;
};

type ChatMsg = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  readAt: string | null;
  createdAt: string;
};

function statusDotClass(s: UserStatusType): string {
  switch (s) {
    case 'AVAILABLE':
      return 'bg-emerald-500';
    case 'BUSY':
      return 'bg-amber-400';
    case 'AWAY':
      return 'bg-red-500';
    default:
      return 'bg-slate-400';
  }
}

export function ChatPanel() {
  const useRealtime =
    typeof process.env.NEXT_PUBLIC_PUSHER_KEY === 'string' &&
    process.env.NEXT_PUBLIC_PUSHER_KEY.length > 0;

  const [open, setOpen] = useState(false);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: me } = useSWR<{ id: string }>(ME_KEY, fetcher, { revalidateOnFocus: true });

  const meId = me?.id ?? null;

  const { data: contacts = [], isLoading: loadingList } = useSWR<Contact[]>(
    CONTACTS_KEY,
    fetcher,
    { refreshInterval: useRealtime ? 0 : 60_000 }
  );

  const { data: unreadData, mutate: mutateUnread } = useSWR<{ count: number }>(
    UNREAD_KEY,
    fetcher,
    { refreshInterval: useRealtime ? 0 : 30_000 }
  );
  const unread = unreadData?.count ?? 0;

  const mk = peerId && open ? messagesKey(peerId) : null;
  const {
    data: messages = [],
    isValidating: loadingThread,
    mutate: mutateMessages,
  } = useSWR<ChatMsg[]>(mk, fetcher, { revalidateOnFocus: true });

  const scrollThreadBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    });
  };

  const markRead = async (otherId: string) => {
    await fetch('/api/chat/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ peerId: otherId }),
    });
    globalMutate(UNREAD_KEY);
  };

  /** Pusher : messages + non lus */
  useEffect(() => {
    if (!useRealtime || !meId) return;
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`private-user-${meId}`);

    channel.bind(
      'new-message',
      (payload: { message: ChatMsg; senderId: string }) => {
        globalMutate(UNREAD_KEY);
        globalMutate(messagesKey(payload.senderId));
      }
    );

    channel.bind(
      'user-status',
      (payload: {
        userId: string;
        userStatus: UserStatusType;
        userStatusChangedAt?: string;
      }) => {
        globalMutate(
          CONTACTS_KEY,
          (prev: Contact[] | undefined) =>
            prev?.map((c) =>
              c.id === payload.userId
                ? { ...c, userStatus: payload.userStatus }
                : c
            ),
          { revalidate: false }
        );
      }
    );

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(`private-user-${meId}`);
    };
  }, [useRealtime, meId]);

  /** Repli sans Pusher : polling ~10s */
  useEffect(() => {
    if (useRealtime) return;
    const t = setInterval(() => {
      globalMutate(CONTACTS_KEY);
      globalMutate(UNREAD_KEY);
      if (open && peerId) {
        globalMutate(messagesKey(peerId));
      }
    }, 10_000);
    return () => clearInterval(t);
  }, [useRealtime, open, peerId]);

  useEffect(() => {
    scrollThreadBottom();
  }, [messages.length, peerId]);

  const selectPeer = async (id: string) => {
    setPeerId(id);
    await markRead(id);
  };

  const send = async () => {
    const text = draft.trim();
    if (!peerId || !text || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ receiverId: peerId, content: text }),
      });
      const data = (await res.json().catch(() => ({}))) as ChatMsg | { error?: string };
      if (!res.ok) {
        toast.error((data as { error?: string }).error ?? 'Envoi impossible');
        return;
      }
      setDraft('');
      await mutateMessages(
        (prev) => [...(prev ?? []), data as ChatMsg],
        { revalidate: false }
      );
      globalMutate(UNREAD_KEY);
      scrollThreadBottom();
    } finally {
      setSending(false);
    }
  };

  const peer = contacts.find((c) => c.id === peerId);

  const toggleOpen = useCallback(() => {
    setOpen((o) => !o);
    globalMutate(CONTACTS_KEY);
    globalMutate(UNREAD_KEY);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
        <Button
          type="button"
          size="icon"
          className={cn(
            'relative h-14 w-14 rounded-full shadow-lg border border-slate-200/80',
            'bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
          )}
          onClick={toggleOpen}
          aria-label="Messagerie équipe"
        >
          <MessageCircle className="h-7 w-7 text-white" />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-600 text-[10px] font-bold text-white flex items-center justify-center px-1 border-2 border-white"
              aria-label={`${unread} message(s) non lu(s)`}
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </div>

      {open && (
        <div
          className={cn(
            'fixed bottom-24 right-6 z-[60] flex w-[min(100vw-2rem,420px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium',
            'h-[min(560px,calc(100vh-7rem))]'
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Équipe</p>
              <p className="text-xs text-slate-500">
                {useRealtime ? 'Temps réel (Pusher)' : 'Mode polling'} · statut dans la barre latérale
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex min-h-0 flex-1">
            <div className="w-[40%] min-w-[132px] border-r border-slate-100 overflow-y-auto bg-slate-50/50">
              {loadingList && contacts.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <ul className="p-2 space-y-1">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectPeer(c.id)}
                        className={cn(
                          'w-full rounded-lg px-2 py-2 text-left text-xs transition-colors',
                          peerId === c.id
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-white text-slate-700'
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white',
                              statusDotClass(c.userStatus)
                            )}
                            title={c.userStatus}
                          />
                          <span className="truncate font-medium">{c.nom}</span>
                        </span>
                        <span className="block truncate text-[10px] text-slate-500 mt-0.5 pl-4">
                          {c.role}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col bg-white">
              {!peerId ? (
                <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-slate-500">
                  Choisissez un collègue pour discuter.
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {peer?.nom}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{peer?.email}</p>
                  </div>
                  <div
                    ref={listRef}
                    className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0"
                  >
                    {loadingThread && messages.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      </div>
                    ) : (
                      messages.map((m) => {
                        const mine = meId && m.senderId === meId;
                        return (
                          <div
                            key={m.id}
                            className={cn('flex', mine ? 'justify-end' : 'justify-start')}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                                mine
                                  ? 'bg-blue-600 text-white rounded-br-sm'
                                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                              )}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <p
                                className={cn(
                                  'mt-1 text-[10px] opacity-80',
                                  mine ? 'text-blue-100' : 'text-slate-500'
                                )}
                              >
                                {format(new Date(m.createdAt), 'HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="border-t border-slate-100 p-2 flex gap-2">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Écrire un message…"
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="shrink-0 bg-gradient-to-b from-blue-500 to-blue-600"
                      disabled={sending || !draft.trim()}
                      onClick={send}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
