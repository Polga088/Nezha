import { NextResponse } from 'next/server';

import { ensureGlobalSettings } from '@/lib/global-settings';
import { createPublicReservation } from '@/lib/public-reservation-service';
import { consumePublicReservationAttempt, getPublicReservationClientIp } from '@/lib/public-reservation-rate-limit';

export async function POST(request: Request) {
  const ip = getPublicReservationClientIp(request.headers);
  if (!consumePublicReservationAttempt(ip).ok) {
    return NextResponse.json({ error: 'Veuillez réessayer plus tard.' }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    body = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  try {
    const settings = await ensureGlobalSettings();
    const result = await createPublicReservation(
      body as Parameters<typeof createPublicReservation>[0],
      settings.publicReservationCndpVersion?.trim() || null,
      settings.publicReservationCndpText?.trim() ||
        'J’accepte que mes données personnelles soient traitées par le cabinet médical afin de gérer ma demande de rendez-vous et mon dossier patient.'
    );

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json(
      {
        token: result.appointment.publicBookingToken,
        reference: result.appointment.publicBookingToken?.slice(0, 10).toUpperCase() ?? null,
        confirmationUrl: `/reservation/confirmation/${result.appointment.publicBookingToken}`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/public/reservation]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

