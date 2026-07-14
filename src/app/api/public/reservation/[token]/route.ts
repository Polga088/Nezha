import { NextResponse } from 'next/server';

import { getPublicReservationConfirmationData } from '@/lib/public-reservation-service';

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { token } = await params;
    const data = await getPublicReservationConfirmationData(token);
    if (!data) {
      return NextResponse.json({ error: 'Réservation introuvable' }, { status: 404 });
    }
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/public/reservation/[token]]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
