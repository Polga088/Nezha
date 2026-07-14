import { NextResponse } from 'next/server';

import { getPublicReservationConfigData } from '@/lib/public-reservation-service';

export async function GET() {
  try {
    const payload = await getPublicReservationConfigData();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('[GET /api/public/reservation/config]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

