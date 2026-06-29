import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAssistant } from '@/lib/requireAssistant';
import { resolveAssistantVisibleDoctorId } from '@/lib/doctor-status-helpers';
import { triggerAssistantSignal } from '@/lib/pusher-server';

/** POST /api/assistant/doctor-signal — flash discret sur l’écran du médecin. */
export async function POST(request: NextRequest) {
  const auth = await requireAssistant(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const doctorId =
      typeof body.doctorId === 'string' && body.doctorId.length > 0
        ? body.doctorId
        : await resolveAssistantVisibleDoctorId();

    const doctor = doctorId
      ? await prisma.user.findFirst({
          where: {
            id: doctorId,
            role: 'DOCTOR',
            isActive: true,
          },
          select: { id: true },
        })
      : null;

    if (!doctor) {
      return NextResponse.json({ error: 'Médecin introuvable' }, { status: 404 });
    }

    const sentAt = new Date().toISOString();
    await triggerAssistantSignal(doctor.id, {
      assistantId: auth.assistant.id,
      assistantName: auth.assistant.nom || 'Accueil',
      sentAt,
    });

    return NextResponse.json({ ok: true, doctorId: doctor.id, sentAt });
  } catch (e) {
    console.error('[assistant/doctor-signal] POST', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
