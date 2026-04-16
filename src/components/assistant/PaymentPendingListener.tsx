'use client';

import { useEffect } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Banknote } from 'lucide-react';

import { useSettings } from '@/hooks/useSettings';
import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import { getPusherClient } from '@/lib/pusher-client';
import { playPatientCallDing } from '@/lib/play-patient-call-ding';
import type { PaymentPendingPayload } from '@/lib/payment-pending-types';

const NOTIFICATIONS_KEY = '/api/notifications?limit=25';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

/**
 * Clôture médecin — encaissement à traiter (`payment-pending`).
 */
export function PaymentPendingListener() {
  const router = useRouter();
  const { settings: cabinetSettings } = useSettings(true);
  const montantSuffix = currencyAmountSuffix(cabinetSettings?.currency?.trim() || 'EUR');
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

    const handler = (payload: PaymentPendingPayload) => {
      playPatientCallDing();
      void globalMutate(NOTIFICATIONS_KEY);
      const nomComplet = `${payload.patientPrenom} ${payload.patientNom}`.trim();
      const montantHint =
        payload.montantSuggestion != null
          ? ` — montant indicatif ${payload.montantSuggestion.toFixed(2)}\u00a0${montantSuffix}`
          : '';
      const subtitle = `${nomComplet.length > 0 ? nomComplet : 'Patient'} — Dr. ${payload.doctorNom}${montantHint}`;

      const markNotificationRead = async (notificationId: string | undefined) => {
        if (!notificationId) return;
        try {
          const res = await fetch(`/api/notifications/${notificationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ read: true }),
          });
          if (res.ok) {
            await globalMutate(NOTIFICATIONS_KEY);
          }
        } catch {
          /* ignore */
        }
      };

      const openEncaissement = (toastId: string | number) => {
        toast.dismiss(toastId);
        void markNotificationRead(payload.notificationId);
        router.push(`/dashboard?encaisser=${encodeURIComponent(payload.appointmentId)}`);
      };

      toast.custom(
        (toastId) => (
          <button
            type="button"
            className="flex w-full max-w-md cursor-pointer items-start gap-3 rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3.5 text-left text-white shadow-lg transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            role="status"
            tabIndex={0}
            aria-label="Ouvrir l’encaissement pour ce patient"
            onClick={() => openEncaissement(toastId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openEncaissement(toastId);
              }
            }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/25">
              <Banknote className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-bold tracking-tight">Consultation terminée</p>
              <p className="mt-1 text-sm font-medium text-emerald-50">{subtitle}</p>
              <p className="mt-1.5 text-xs text-emerald-100/95">
                Patient prêt pour facturation — cliquez pour encaisser.
              </p>
            </div>
          </button>
        ),
        { duration: 14_000, position: 'top-center' }
      );
    };

    channel.bind('payment-pending', handler);

    return () => {
      channel.unbind('payment-pending', handler);
      pusher.unsubscribe(channelName);
    };
  }, [useRealtime, me?.id, me?.role, router, montantSuffix]);

  return null;
}
