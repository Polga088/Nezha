import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAssistant } from '@/lib/requireAssistant';
import { getDoctorStatusPayload } from '@/lib/doctor-status-helpers';

/** GET /api/assistant/doctor-status — statut praticien enrichi pour l’accueil. */
export async function GET(request: NextRequest) {
  const auth = await requireAssistant(request);
  if (!auth.ok) return auth.response;

  const preferredEmail = process.env.ASSISTANT_VISIBILITY_DOCTOR_EMAIL?.trim();

  let doctorRow =
    preferredEmail ?
      await prisma.user.findFirst({
        where: {
          role: 'DOCTOR',
          isActive: true,
          email: { equals: preferredEmail, mode: 'insensitive' },
        },
        select: { id: true },
      })
    : null;

  if (!doctorRow) {
    doctorRow = await prisma.user.findFirst({
      where: { role: 'DOCTOR', isActive: true },
      orderBy: { nom: 'asc' },
      select: { id: true },
    });
  }

  if (!doctorRow) {
    return NextResponse.json({ doctor: null });
  }

  const doctor = await getDoctorStatusPayload(doctorRow.id);
  return NextResponse.json({ doctor });
}
