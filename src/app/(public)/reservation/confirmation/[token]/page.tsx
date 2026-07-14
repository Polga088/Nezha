import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, CalendarDays, Clock3, UserRound } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale/fr';

import { getPublicReservationConfirmationData } from '@/lib/public-reservation-service';

type ConfirmationPageProps = {
  params: Promise<{ token: string }>;
};

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ConfirmationPageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getPublicReservationConfirmationData(token);
  return {
    title: data ? `Confirmation ${data.reference}` : 'Confirmation de réservation',
  };
}

export default async function ReservationConfirmationPage({ params }: ConfirmationPageProps) {
  const { token } = await params;
  const data = await getPublicReservationConfirmationData(token);

  if (!data) {
    notFound();
  }

  const start = parseISO(data.date);
  const statusLabel =
    data.confirmationStatus === 'WAITING'
      ? 'En attente'
      : data.confirmationStatus === 'PAID'
        ? 'Réglé'
        : data.confirmationStatus;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="clinical-panel space-y-6 p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              Réservation confirmée
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Votre rendez-vous a bien été enregistré
            </h1>
            <p className="text-sm text-slate-600">
              Référence publique : <span className="font-semibold text-slate-900">{data.reference}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Date</p>
              <p className="text-sm font-semibold text-slate-900">
                {format(start, 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Heure</p>
              <p className="text-sm font-semibold text-slate-900">
                {data.time}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:col-span-2">
            <UserRound className="mt-0.5 h-5 w-5 text-blue-600" aria-hidden />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">Médecin</p>
              <p className="text-sm font-semibold text-slate-900">
                {data.doctor.nom}
                {data.doctor.specialite ? ` — ${data.doctor.specialite}` : ''}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Le cabinet a bien reçu votre demande. Vous pouvez conserver cette référence pour vos échanges avec l’équipe.
          </p>
          <p className="text-slate-500">
            Source : {data.bookingSourceLabel} · Statut : {statusLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/reservation" className="clinical-button">
            Nouvelle réservation
          </Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    </div>
  );
}
