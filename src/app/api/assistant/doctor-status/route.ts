import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAssistant } from '@/lib/requireAssistant';

/** GET /api/assistant/doctor-status — médecin de référence pour la bannière statut (temps réel Pusher). */
export async function GET(request: NextRequest) {
  const auth = await requireAssistant(request);
  if (!auth.ok) return auth.response;

  /** Si défini, médecin affiché à l’accueil ; sinon premier médecin actif (ordre alphabétique). */
  const preferredEmail = process.env.ASSISTANT_VISIBILITY_DOCTOR_EMAIL?.trim();

  let doctor =
    preferredEmail ?
      await prisma.user.findFirst({
        where: {
          role: 'DOCTOR',
          isActive: true,
          email: { equals: preferredEmail, mode: 'insensitive' },
        },
        select: {
          id: true,
          nom: true,
          email: true,
          userStatus: true,
          userStatusChangedAt: true,
        },
      })
    : null;

  if (!doctor) {
    doctor = await prisma.user.findFirst({
      where: {
        role: 'DOCTOR',
        isActive: true,
      },
      orderBy: { nom: 'asc' },
      select: {
        id: true,
        nom: true,
        email: true,
        userStatus: true,
        userStatusChangedAt: true,
      },
    });
  }

  if (!doctor) {
    return NextResponse.json({ doctor: null });
  }

  return NextResponse.json({
    doctor: {
      ...doctor,
      userStatusChangedAt: doctor.userStatusChangedAt.toISOString(),
    },
  });
}
