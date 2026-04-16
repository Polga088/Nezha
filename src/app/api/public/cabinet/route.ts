import { NextResponse } from 'next/server';

import { getPublicCabinetBranding } from '@/lib/get-public-cabinet-branding';

/** Données cabinet publiques (landing, carte, coordonnées) — sans authentification. */
export async function GET() {
  try {
    const payload = await getPublicCabinetBranding();
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (e) {
    console.error('[GET /api/public/cabinet]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
