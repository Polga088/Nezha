import { NextResponse } from 'next/server';

import { getPublicReservationSlotsData } from '@/lib/public-reservation-service';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get('doctorId')?.trim() ?? '';
    const date = url.searchParams.get('date')?.trim() ?? '';

    if (!doctorId || !date) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }

    const slots = await getPublicReservationSlotsData(doctorId, date);
    return NextResponse.json({
      doctorId,
      date,
      slots,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('[GET /api/public/reservation/slots]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
