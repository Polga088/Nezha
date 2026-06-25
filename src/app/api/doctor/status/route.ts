import { NextRequest, NextResponse } from 'next/server';
import { verifyJwt } from '@/lib/auth';
import { getDoctorStatusPayload } from '@/lib/doctor-status-helpers';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}

/** GET /api/doctor/status — statut effectif du médecin connecté (consultation incluse). */
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  if (String(user.role).toUpperCase() !== 'DOCTOR') {
    return NextResponse.json({ error: 'Réservé aux médecins' }, { status: 403 });
  }

  const doctorId = user.id != null ? String(user.id) : null;
  if (!doctorId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  try {
    const doctor = await getDoctorStatusPayload(doctorId);
    if (!doctor) {
      return NextResponse.json({ error: 'Médecin introuvable' }, { status: 404 });
    }
    return NextResponse.json({ doctor });
  } catch (e) {
    console.error('[GET /api/doctor/status]', e);
    return NextResponse.json({ error: 'Impossible de charger le statut' }, { status: 500 });
  }
}
