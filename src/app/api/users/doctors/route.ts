import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

/**
 * GET /api/users/doctors — liste des médecins actifs (planification RDV, caisse, etc.).
 * Staff : ADMIN, DOCTOR, ASSISTANT (voir middleware).
 */
export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  try {
    const rows = await prisma.user.findMany({
      where: { role: 'DOCTOR', isActive: true },
      select: { id: true, nom: true },
      orderBy: { nom: 'asc' },
    });

    const doctors = rows.map((u) => ({
      id: u.id,
      nom: u.nom,
      /** Champ réservé ; le modèle User n’a pas encore de colonne `prenom` dédiée. */
      prenom: '',
    }));

    return NextResponse.json(doctors);
  } catch (e) {
    console.error('[GET /api/users/doctors]', e);
    return NextResponse.json({ error: 'Erreur lors du chargement des médecins' }, { status: 500 });
  }
}
