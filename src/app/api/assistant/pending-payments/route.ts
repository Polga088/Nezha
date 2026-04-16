import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

/**
 * GET — RDV en attente d’encaissement (FINISHED sans facture ou facture non soldée).
 * Accueil / admin uniquement.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const user = await verifyJwt(token);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const role = String(user.role).toUpperCase();
  if (role !== 'ASSISTANT' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    const list = await prisma.appointment.findMany({
      where: {
        statut: 'FINISHED',
      },
      orderBy: { updatedAt: 'desc' },
      take: 80,
      include: {
        patient: { select: { id: true, nom: true, prenom: true, tel: true } },
        doctor: { select: { nom: true } },
        invoice: { select: { id: true, statut: true, montant: true } },
      },
    });

    const pending = list.filter((a) => !a.invoice || a.invoice.statut !== 'PAID');
    return NextResponse.json(pending);
  } catch (e) {
    console.error('[GET /api/assistant/pending-payments]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
