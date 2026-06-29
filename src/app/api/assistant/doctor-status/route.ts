import { NextRequest, NextResponse } from 'next/server';
import { requireAssistant } from '@/lib/requireAssistant';
import {
  getDoctorStatusPayload,
  resolveAssistantVisibleDoctorId,
} from '@/lib/doctor-status-helpers';

/** GET /api/assistant/doctor-status — statut praticien enrichi pour l’accueil. */
export async function GET(request: NextRequest) {
  const auth = await requireAssistant(request);
  if (!auth.ok) return auth.response;

  const doctorId = await resolveAssistantVisibleDoctorId();
  if (!doctorId) {
    return NextResponse.json({ doctor: null });
  }

  const doctor = await getDoctorStatusPayload(doctorId);
  return NextResponse.json({ doctor });
}
