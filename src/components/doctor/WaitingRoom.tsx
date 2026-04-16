'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { Building2, MoreHorizontal, Phone } from 'lucide-react';
import { differenceInMilliseconds } from 'date-fns';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildWaitingQueueQuery, getTodayRange } from '@/lib/appointments-range';
import { cn } from '@/lib/utils';
import { BOOKING_CHANNEL_LABEL } from '@/lib/booking-channel';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

export type WaitingRoomAppointment = {
  id: string;
  date_heure: string;
  motif: string;
  statut: string;
  arrivalTime: string | null;
  waitingRoomOrder: number;
  appointmentType?: string | null;
  bookingChannel?: 'PHONE' | 'ON_SITE' | null;
  patient: { nom: string; prenom: string };
  patient_id: string;
  doctor?: { nom: string } | null;
};

function formatWaitShort(arrivalTime: string | null, dateHeure: string, now: Date): string {
  const start = new Date(arrivalTime ?? dateHeure);
  const ms = Math.max(0, differenceInMilliseconds(now, start));
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h} h ${mm.toString().padStart(2, '0')}`;
}

function waitToneClass(arrivalTime: string | null, dateHeure: string, now: Date): string {
  const start = new Date(arrivalTime ?? dateHeure);
  const ms = Math.max(0, differenceInMilliseconds(now, start));
  const minutes = Math.floor(ms / 60000);
  if (minutes < 10) return 'text-emerald-700 bg-emerald-50 border border-outline-variant/15';
  if (minutes < 20) return 'text-amber-700 bg-amber-50 border border-outline-variant/15';
  return 'text-red-700 bg-red-50 border border-outline-variant/15';
}

const TYPE_LABEL: Record<string, string> = {
  URGENT: 'Urgent',
  FIRST_VISIT: '1ʳᵉ visite',
  FOLLOW_UP: 'Suivi',
};

type Me = { id: string; role: string };

type WaitingRoomProps = {
  /** Après appel patient : recharger le reste du dashboard (stats, agenda). */
  onAfterCall?: () => void;
};

/**
 * File d’attente du jour — `GET /api/appointments?statut=WAITING&queue=1&from&to`
 * Filtre médecin : côté API, les RDV sont limités à l’ID du médecin connecté (le paramètre
 * `doctor_id` dans l’URL est redondant mais explicite).
 */
export function WaitingRoom({ onAfterCall }: WaitingRoomProps) {
  const [clock, setClock] = useState(() => new Date());
  const [callingId, setCallingId] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<WaitingRoomAppointment | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const { data: me } = useSWR<Me>('/api/auth/me', fetcher, { revalidateOnFocus: true });

  const queueUrl = useMemo(() => {
    if (!me?.id || me.role !== 'DOCTOR') return null;
    const q = buildWaitingQueueQuery(getTodayRange(), { doctorId: me.id });
    return `/api/appointments?${q}`;
  }, [me?.id, me?.role]);

  const { data: rawList, isLoading, mutate } = useSWR<WaitingRoomAppointment[]>(
    queueUrl,
    fetcher,
    { refreshInterval: 20_000, revalidateOnFocus: true }
  );

  const list = Array.isArray(rawList) ? rawList : [];

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const now = clock;

  const handleCallPatient = useCallback(
    async (appointmentId: string) => {
      setCallingId(appointmentId);
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/call`, {
          method: 'POST',
          credentials: 'same-origin',
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof j.error === 'string' ? j.error : 'Appel impossible');
          return;
        }
        toast.success('Accueil notifié — la file a été signalée');
        await mutate();
        onAfterCall?.();
      } catch {
        toast.error('Erreur réseau');
      } finally {
        setCallingId(null);
      }
    },
    [mutate, onAfterCall]
  );

  const handleConfirmCancel = useCallback(async () => {
    if (!pendingCancel) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/appointments/${pendingCancel.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Annulation impossible');
        return;
      }
      toast.success('Rendez-vous annulé');
      setPendingCancel(null);
      await mutate();
      onAfterCall?.();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCancelLoading(false);
    }
  }, [pendingCancel, mutate, onAfterCall]);

  if (me && me.role !== 'DOCTOR') return null;

  return (
    <>
      <h2 className="text-lg font-semibold tracking-tight text-on-surface">Salle d&apos;attente</h2>
      <Card className="border-0 bg-container-lowest shadow-medical">
        <CardContent className="space-y-3 p-6">
          {!isLoading && list.length === 0 && (
            <p className="py-4 text-center text-sm text-on-surface-variant">
              Aucun rendez-vous en attente aujourd&apos;hui.
            </p>
          )}
          {isLoading && list.length === 0 && (
            <p className="py-4 text-center text-sm text-on-surface-variant">Chargement…</p>
          )}
          {list.map((a) => (
            <div
              key={a.id}
              className="flex flex-col justify-between gap-3 rounded-xl bg-container-low/70 p-4 sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-container-low text-on-surface-variant"
                    title={
                      a.bookingChannel === 'ON_SITE'
                        ? BOOKING_CHANNEL_LABEL.ON_SITE
                        : BOOKING_CHANNEL_LABEL.PHONE
                    }
                  >
                    {a.bookingChannel === 'ON_SITE' ? (
                      <Building2 className="h-4 w-4" aria-hidden />
                    ) : (
                      <Phone className="h-4 w-4" aria-hidden />
                    )}
                  </span>
                  <p className="font-semibold tracking-tight text-on-surface">
                    {a.patient.prenom} {a.patient.nom}
                  </p>
                  {a.appointmentType === 'URGENT' && (
                    <Badge className="border-0 bg-red-100 text-xs font-semibold text-red-800">
                      {TYPE_LABEL.URGENT}
                    </Badge>
                  )}
                  {a.appointmentType === 'FIRST_VISIT' && (
                    <Badge
                      variant="outline"
                      className="border-outline-variant/15 bg-emerald-50 text-xs text-emerald-800"
                    >
                      {TYPE_LABEL.FIRST_VISIT}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-on-surface-variant">{a.motif}</p>
                {a.doctor?.nom && (
                  <p className="mt-0.5 text-[11px] text-on-surface-variant/80">
                    RDV assigné · {a.doctor.nom}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-lg px-2 py-1 text-xs font-semibold tabular-nums',
                    waitToneClass(a.arrivalTime, a.date_heure, now)
                  )}
                >
                  Attente {formatWaitShort(a.arrivalTime, a.date_heure, now)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-lg border border-transparent text-on-surface-variant hover:border-outline-variant/15 hover:bg-container-low hover:text-on-surface"
                      aria-label="Options du rendez-vous"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="min-w-[11rem] border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical"
                  >
                    <DropdownMenuItem
                      className="text-red-600 focus:bg-red-50 focus:text-red-600"
                      onSelect={() => setPendingCancel(a)}
                    >
                      Annuler le RDV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5"
                  disabled={callingId === a.id}
                  onClick={() => void handleCallPatient(a.id)}
                >
                  {callingId === a.id ? (
                    '…'
                  ) : (
                    <>
                      <Phone className="h-3.5 w-3.5" />
                      Appeler
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingCancel}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null);
        }}
      >
        <AlertDialogContent className="border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">Annuler ce rendez-vous ?</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              {pendingCancel ? (
                <>
                  Le rendez-vous de{' '}
                  <span className="font-medium text-on-surface">
                    {pendingCancel.patient.prenom} {pendingCancel.patient.nom}
                  </span>{' '}
                  sera marqué comme annulé. Cette action est visible dans l&apos;historique.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading} className="border-outline-variant/20">
              Retour
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelLoading}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
              onClick={() => void handleConfirmCancel()}
            >
              {cancelLoading ? 'Annulation…' : 'Confirmer l’annulation'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
