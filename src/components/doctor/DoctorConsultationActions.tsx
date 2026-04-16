'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { CheckCircle, Loader2, Stethoscope } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { APPOINTMENT_STATUS_LABEL } from '@/lib/appointment-status';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

export type DoctorConsultationActionsProps = {
  appointments: Array<{
    id: string;
    doctor_id: string;
    statut: string;
    date_heure: string;
  }>;
  onUpdated?: () => void | Promise<void>;
};

/**
 * Actions médecin sur le RDV du patient : démarrer la consultation (WAITING → IN_PROGRESS), clôturer (→ FINISHED).
 */
export function DoctorConsultationActions({ appointments, onUpdated }: DoctorConsultationActionsProps) {
  const { data: me } = useSWR<{ id: string; role: string }>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  });
  const [loading, setLoading] = useState(false);

  if (String(me?.role).toUpperCase() !== 'DOCTOR' || !me?.id) return null;

  const mine = appointments.filter((a) => a.doctor_id === me.id);
  const sortedAsc = [...mine].sort(
    (a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime()
  );
  const sortedDesc = [...mine].sort(
    (a, b) => new Date(b.date_heure).getTime() - new Date(a.date_heure).getTime()
  );

  const inProgress = mine.find((a) => a.statut === 'IN_PROGRESS');
  const firstWaiting = sortedAsc.find((a) => a.statut === 'WAITING');

  /** RDV prioritaire : en cours, sinon premier en attente, sinon dernier créneau encore « actif » (hors payé / annulé). */
  const target =
    inProgress ??
    firstWaiting ??
    sortedDesc.find((a) => a.statut !== 'PAID' && a.statut !== 'CANCELED') ??
    sortedDesc[0] ??
    null;

  const canShowStartConsultation =
    target != null &&
    target.statut !== 'IN_PROGRESS' &&
    target.statut !== 'PAID' &&
    target.statut !== 'CANCELED';

  const canCloturer =
    target != null &&
    target.statut !== 'PAID' &&
    target.statut !== 'CANCELED' &&
    target.statut !== 'FINISHED';

  const start = async () => {
    if (!target) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ statut: 'IN_PROGRESS' }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Action impossible');
        return;
      }
      toast.success('Consultation démarrée');
      await onUpdated?.();
    } finally {
      setLoading(false);
    }
  };

  const close = async () => {
    if (!target) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${target.id}/close`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Clôture impossible');
        return;
      }
      toast.success('Consultation clôturée — l’accueil a été alertée pour l’encaissement');
      await onUpdated?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-2xl border-0 bg-blue-50/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-slate-800">
          <Stethoscope className="h-5 w-5 text-blue-600" />
          Workflow consultation
        </CardTitle>
        <CardDescription>
          {target ? (
            <>
              Statut actuel du créneau :{' '}
              <span className="font-medium text-slate-800">
                {APPOINTMENT_STATUS_LABEL[target.statut] ?? target.statut}
              </span>
            </>
          ) : mine.length === 0 ? (
            <span className="text-slate-600">
              Aucun rendez-vous ne vous est assigné pour ce patient.
            </span>
          ) : (
            <span className="text-slate-600">
              Aucun créneau éligible pour démarrer une consultation (tous réglés ou annulés).
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {target?.statut !== 'IN_PROGRESS' && (
          <Button
            type="button"
            disabled={loading || !canShowStartConsultation}
            onClick={() => void start()}
            className="gap-2"
            title={
              canShowStartConsultation
                ? undefined
                : !target
                  ? 'Aucun rendez-vous disponible pour démarrer'
                  : 'Ce créneau ne peut pas être passé en consultation (réglé ou annulé)'
            }
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stethoscope className="h-4 w-4" />}
            Commencer la consultation
          </Button>
        )}
        {canCloturer ? (
          <Button
            type="button"
            disabled={loading}
            onClick={() => void close()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Clôturer
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
