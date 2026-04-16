'use client';

import { useEffect, useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { CheckCircle2, ListOrdered, Stethoscope } from 'lucide-react';

import {
  buildAppointmentsByStatutQuery,
  buildAppointmentsQuery,
  buildWaitingQueueQuery,
  getTodayRange,
} from '@/lib/appointments-range';
import { APPOINTMENT_STATUS_LABEL } from '@/lib/appointment-status';
import { EncaisserPaymentDialog } from '@/components/dashboard/EncaisserPaymentDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import { cn } from '@/lib/utils';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error();
    return r.json();
  });

type Me = { id: string; role: string };

type TodayAppt = {
  id: string;
  date_heure: string;
  motif: string;
  statut: string;
  arrivalTime?: string | null;
  patient_id: string;
  patient: { prenom: string; nom: string };
};

type CabinetSettings = {
  currency?: string;
  defaultConsultationPrice?: number;
  acceptedPaymentMethods?: string[];
};

const cardShellDoctor =
  'rounded-2xl border-0 bg-white shadow-sm transition-shadow hover:shadow-md';
const cardShellDefault =
  'rounded-2xl border border-sky-100/80 bg-white shadow-sm transition-shadow hover:shadow-md';

export type DailyOverviewVariant = 'default' | 'doctor';

type DailyOverviewProps = {
  /** Médecin : file + agenda du jour uniquement (pas d’encaissement ni tuiles stats). */
  variant?: DailyOverviewVariant;
  /** Ouvre le dialogue d’encaissement pour ce RDV (ex. `?encaisser=` depuis le toast). */
  openEncaissementAppointmentId?: string | null;
};

export function DailyOverview({
  variant = 'default',
  openEncaissementAppointmentId = null,
}: DailyOverviewProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { data: me } = useSWR<Me>('/api/auth/me', fetcher, { revalidateOnFocus: true });
  const [encaissementTarget, setEncaissementTarget] = useState<TodayAppt | null>(null);

  const appointmentsUrl = useMemo(() => {
    if (!me) return null;
    const q = buildAppointmentsQuery(getTodayRange(), {
      doctorId: me.role === 'DOCTOR' ? me.id : null,
      role: me.role,
    });
    return `/api/appointments?${q}`;
  }, [me]);

  const waitingQueueUrl = useMemo(() => {
    if (!me) return null;
    return `/api/appointments?${buildWaitingQueueQuery(getTodayRange())}`;
  }, [me]);

  const isDoctorView = variant === 'doctor';

  useEffect(() => {
    if (!openEncaissementAppointmentId || isDoctorView || !me) return;
    const role = String(me.role).toUpperCase();
    if (!['ASSISTANT', 'ADMIN'].includes(role)) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/appointments/${openEncaissementAppointmentId}`, {
          credentials: 'same-origin',
        });
        if (!res.ok || cancelled) return;
        const appt = (await res.json()) as {
          id: string;
          date_heure: string;
          motif: string;
          statut: string;
          arrivalTime?: string | null;
          patient_id: string;
          patient: { prenom: string; nom: string };
        };
        if (appt.statut !== 'FINISHED') {
          toast.info('Ce rendez-vous n’est plus en attente d’encaissement.');
          router.replace('/dashboard', { scroll: false });
          return;
        }
        setEncaissementTarget({
          id: appt.id,
          date_heure: appt.date_heure,
          motif: appt.motif,
          statut: appt.statut,
          arrivalTime: appt.arrivalTime ?? null,
          patient_id: appt.patient_id,
          patient: appt.patient,
        });
        router.replace('/dashboard', { scroll: false });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openEncaissementAppointmentId, isDoctorView, me, router]);

  const finishedTodayUrl = useMemo(() => {
    if (!me || isDoctorView) return null;
    return `/api/appointments?${buildAppointmentsByStatutQuery(getTodayRange(), 'FINISHED')}`;
  }, [me, isDoctorView]);

  const paidTodayUrl = useMemo(() => {
    if (!me || isDoctorView) return null;
    return `/api/appointments?${buildAppointmentsByStatutQuery(getTodayRange(), 'PAID')}`;
  }, [me, isDoctorView]);

  const { data: settings } = useSWR<CabinetSettings>(
    me ? '/api/admin/settings' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: appointments, isLoading: apptsLoading } = useSWR<TodayAppt[]>(
    appointmentsUrl,
    fetcher,
    { refreshInterval: 45_000, revalidateOnFocus: true }
  );

  const { data: waitingQueue, isLoading: queueLoading } = useSWR<TodayAppt[]>(
    waitingQueueUrl,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const { data: finishedToday, isLoading: finishedLoading } = useSWR<TodayAppt[]>(
    finishedTodayUrl,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );

  const { data: paidToday, isLoading: paidLoading } = useSWR<TodayAppt[]>(
    paidTodayUrl,
    fetcher,
    { refreshInterval: 45_000, revalidateOnFocus: true }
  );

  const currencyLabel = currencyAmountSuffix(settings?.currency?.trim() || 'EUR');
  const defaultMontant =
    settings?.defaultConsultationPrice != null && settings.defaultConsultationPrice > 0
      ? settings.defaultConsultationPrice
      : 300;

  const canEncaisser =
    me != null && ['ASSISTANT', 'ADMIN'].includes(String(me.role).toUpperCase());

  const list = Array.isArray(appointments) ? appointments : [];
  const sortedToday = [...list].sort(
    (a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime()
  );

  const queue = Array.isArray(waitingQueue) ? waitingQueue : [];
  const finishedList = Array.isArray(finishedToday) ? finishedToday : [];
  const paidList = Array.isArray(paidToday) ? paidToday : [];
  const encaissementLoading = isDoctorView ? false : finishedLoading || paidLoading;
  const fileEtEncaissementVide =
    !isDoctorView &&
    !queueLoading &&
    !encaissementLoading &&
    queue.length === 0 &&
    finishedList.length === 0 &&
    paidList.length === 0;

  const statusBadgeLabel = (a: TodayAppt): string => {
    const s = a.statut;
    if (s === 'WAITING' && a.arrivalTime) return 'En salle d’attente';
    return APPOINTMENT_STATUS_LABEL[s] ?? s;
  };

  const statTile = (label: string, value: number | string, accent: 'sky' | 'amber' | 'emerald') => {
    const accentMap = {
      sky: 'border-sky-100/90 bg-sky-50/40 text-sky-800',
      amber: 'border-amber-100/90 bg-amber-50/35 text-amber-900',
      emerald: 'border-emerald-100/90 bg-emerald-50/35 text-emerald-900',
    };
    return (
      <div
        className={cn(
          'rounded-2xl border px-4 py-3 shadow-sm',
          accentMap[accent]
        )}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 md:text-2xl">{value}</p>
      </div>
    );
  };

  const cardShell = isDoctorView ? cardShellDoctor : cardShellDefault;

  return (
    <section
      className={cn('text-slate-800', isDoctorView ? 'space-y-10' : 'space-y-6')}
      aria-label="Vue opérationnelle du jour"
    >
      {!isDoctorView && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {statTile(
            'RDV du jour',
            apptsLoading ? '—' : sortedToday.length,
            'sky'
          )}
          {statTile(
            'En file',
            queueLoading ? '—' : queue.length,
            'amber'
          )}
          {statTile(
            'À encaisser',
            encaissementLoading ? '—' : finishedList.length,
            'sky'
          )}
          {statTile(
            'Réglés',
            encaissementLoading ? '—' : paidList.length,
            'emerald'
          )}
        </div>
      )}

      <Card className={cn('overflow-hidden', cardShell, !isDoctorView && 'border-sky-100/80')}>
        <CardHeader
          className={cn(
            'space-y-1 px-5 py-4 sm:px-6',
            isDoctorView ? 'border-0 bg-white pb-3 pt-5' : 'border-b border-sky-100/60 bg-sky-50/30'
          )}
        >
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 md:text-lg">
            <ListOrdered className="h-5 w-5 text-sky-600" aria-hidden />
            File d&apos;attente
          </CardTitle>
          <CardDescription
            className={cn('text-sm', isDoctorView ? 'font-light text-slate-500' : 'text-slate-600')}
          >
            Priorité du jour — même ordre qu&apos;à l&apos;accueil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 bg-white px-5 py-6 sm:px-6">
          {queueLoading && (
            <p className="py-8 text-center text-sm text-slate-500">Chargement…</p>
          )}
          {!isDoctorView &&
            !queueLoading &&
            encaissementLoading &&
            queue.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-500">Chargement encaissement…</p>
          )}
          {fileEtEncaissementVide && (
            <p className="py-8 text-center text-sm text-slate-500">
              Aucune entrée file d&apos;attente ni encaissement pour le moment.
            </p>
          )}
          {!isDoctorView &&
            !queueLoading &&
            !fileEtEncaissementVide &&
            queue.length === 0 &&
            (finishedList.length > 0 || paidList.length > 0) && (
              <p className="py-1 text-center text-sm text-slate-500">
                Aucun patient en attente de passage dans la file.
              </p>
            )}
          <div className="space-y-3">
            {queue.map((rdv, idx) => (
              <Link
                key={rdv.id}
                href={`/dashboard/patients/${rdv.patient_id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-sky-100/70 bg-sky-50/25 px-4 py-3.5 transition-colors hover:bg-sky-50/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-sky-800 shadow-sm">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block font-semibold text-slate-900">
                      {rdv.patient.prenom} {rdv.patient.nom}
                    </span>
                    <span className="text-xs text-slate-600">
                      {format(new Date(rdv.date_heure), 'HH:mm', { locale: fr })} — {rdv.motif}
                      {rdv.arrivalTime ? ' · en salle' : ''}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!isDoctorView && !encaissementLoading && finishedList.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                À encaisser (consultation terminée)
              </p>
              {finishedList.map((rdv) => (
                <div
                  key={rdv.id}
                  className="flex flex-col gap-2 rounded-2xl border border-sky-100/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/dashboard/patients/${rdv.patient_id}`}
                    className="min-w-0 flex-1 transition-opacity hover:opacity-90"
                  >
                    <span className="block font-semibold text-slate-900">
                      {rdv.patient.prenom} {rdv.patient.nom}
                    </span>
                    <span className="text-xs text-slate-600">
                      {format(new Date(rdv.date_heure), 'HH:mm', { locale: fr })} — {rdv.motif}
                    </span>
                  </Link>
                  {canEncaisser && (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full shrink-0 bg-gradient-to-b from-sky-500 to-sky-600 sm:w-auto"
                      onClick={() => setEncaissementTarget(rdv)}
                    >
                      Encaisser
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isDoctorView && !encaissementLoading && paidList.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Réglés aujourd&apos;hui
              </p>
              {paidList.map((rdv) => (
                <div
                  key={rdv.id}
                  className="flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-emerald-50/30 px-4 py-3"
                >
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-emerald-600"
                    aria-hidden
                  />
                  <Link
                    href={`/dashboard/patients/${rdv.patient_id}`}
                    className="min-w-0 flex-1 transition-opacity hover:opacity-90"
                  >
                    <span className="block font-semibold text-slate-900">
                      {rdv.patient.prenom} {rdv.patient.nom}
                    </span>
                    <span className="text-xs text-slate-600">
                      {format(new Date(rdv.date_heure), 'HH:mm', { locale: fr })} — {rdv.motif}
                    </span>
                  </Link>
                  <span className="shrink-0 rounded-full bg-emerald-100/90 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    {APPOINTMENT_STATUS_LABEL['PAID']}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={cn(isDoctorView ? 'border-0' : 'border-slate-100/90', cardShell)}>
        <CardHeader className="space-y-1 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800 md:text-lg">
            <Stethoscope className="h-5 w-5 text-sky-600" aria-hidden />
            Rendez-vous du jour
          </CardTitle>
          <CardDescription
            className={cn('text-sm', isDoctorView ? 'font-light text-slate-500' : 'text-slate-600')}
          >
            Ordre chronologique — accès au dossier patient
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-5 pb-6 sm:px-6">
          {apptsLoading && (
            <p className="py-8 text-center text-sm text-slate-500">Chargement…</p>
          )}
          {!apptsLoading && sortedToday.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              Aucun rendez-vous aujourd&apos;hui.
            </p>
          )}
          {sortedToday.map((rdv) => (
            <Link
              key={rdv.id}
              href={`/dashboard/patients/${rdv.patient_id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100/90 bg-slate-50/40 px-4 py-3.5 transition-colors hover:bg-sky-50/40"
            >
              <div className="min-w-0">
                <span className="block font-semibold tracking-tight text-slate-900">
                  {rdv.patient.prenom} {rdv.patient.nom}
                </span>
                <span className="text-xs text-slate-600">
                  {format(new Date(rdv.date_heure), 'HH:mm', { locale: fr })} — {rdv.motif}
                </span>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                  rdv.statut === 'WAITING' && rdv.arrivalTime
                    ? 'bg-amber-100/90 text-amber-900'
                    : 'bg-sky-50 text-sky-900'
                )}
              >
                {statusBadgeLabel(rdv)}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>

      {!isDoctorView && (
        <EncaisserPaymentDialog
          open={encaissementTarget != null}
          onOpenChange={(open) => {
            if (!open) setEncaissementTarget(null);
          }}
          appointmentId={encaissementTarget?.id ?? null}
          patientLabel={
            encaissementTarget
              ? `${encaissementTarget.patient.prenom} ${encaissementTarget.patient.nom}`
              : ''
          }
          defaultMontant={defaultMontant}
          currencyLabel={currencyLabel}
          acceptedPaymentMethods={settings?.acceptedPaymentMethods}
          onPaid={async () => {
            await Promise.all([
              finishedTodayUrl ? mutate(finishedTodayUrl) : Promise.resolve(),
              paidTodayUrl ? mutate(paidTodayUrl) : Promise.resolve(),
              appointmentsUrl ? mutate(appointmentsUrl) : Promise.resolve(),
            ]);
          }}
        />
      )}
    </section>
  );
}
