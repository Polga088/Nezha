'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const NOTIFICATIONS_KEY = '/api/notifications?limit=25';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<{
    items: Array<{
      id: string;
      title: string;
      message: string;
      type: string;
      read: boolean;
      createdAt: string;
    }>;
    unreadCount: number;
  }>;
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const { data, isLoading, mutate } = useSWR(NOTIFICATIONS_KEY, fetcher, {
    refreshInterval: 18_000,
    revalidateOnFocus: true,
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handleMarkRead = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/notifications/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ read: true }),
        });
        if (!res.ok) {
          toast.error('Mise à jour impossible');
          return;
        }
        await mutate();
      } catch {
        toast.error('Erreur réseau');
      }
    },
    [mutate]
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        toast.error('Action impossible');
        return;
      }
      await mutate();
    } catch {
      toast.error('Erreur réseau');
    }
  }, [mutate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 shadow-sm transition-colors',
            'hover:bg-slate-50 hover:text-slate-900',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40'
          )}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} non lues`
              : 'Notifications'
          }
        >
          <Bell className="h-5 w-5" aria-hidden />
          {unreadCount > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,22rem)] rounded-2xl border-slate-200/90 p-0 shadow-sm"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700"
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Tout lu
            </Button>
          ) : null}
        </div>
        <div className="max-h-[min(60vh,320px)] overflow-y-auto">
          {isLoading && !data ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              Aucune notification pour le moment.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-slate-50/90',
                      !n.read && 'bg-sky-50/50'
                    )}
                    onClick={() => {
                      if (!n.read) void handleMarkRead(n.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'text-xs font-semibold uppercase tracking-wide',
                          n.type === 'URGENT' && 'text-amber-700',
                          n.type === 'SUCCESS' && 'text-emerald-700',
                          n.type === 'INFO' && 'text-sky-700'
                        )}
                      >
                        {n.type === 'URGENT'
                          ? 'Urgent'
                          : n.type === 'SUCCESS'
                            ? 'Succès'
                            : 'Info'}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {format(new Date(n.createdAt), 'HH:mm', { locale: fr })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">{n.message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
