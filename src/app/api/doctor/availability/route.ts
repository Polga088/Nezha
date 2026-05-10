import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import {
  weeklyAvailabilitySchema,
  weeklyFromDb,
  defaultWeeklyAvailability,
} from '@/lib/doctor-availability';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

/** GET /api/doctor/availability — horaires du médecin connecté */
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  if (String(user.role).toUpperCase() !== 'DOCTOR') {
    return NextResponse.json({ error: 'Réservé aux médecins' }, { status: 403 });
  }

  const doctorId = user.id != null && String(user.id).trim() !== '' ? String(user.id) : null;
  if (!doctorId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  try {
    const row = await prisma.availability.findUnique({
      where: { doctorId },
    });
    const weekly = row?.weekly != null ? weeklyFromDb(row.weekly) : defaultWeeklyAvailability();
    return NextResponse.json({
      doctorId,
      weekly,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error('[GET /api/doctor/availability]', e);
    return NextResponse.json(
      { error: 'Impossible de charger les disponibilités' },
      { status: 500 }
    );
  }
}

/** PUT /api/doctor/availability — upsert (crée ou met à jour la ligne Availability) */
export async function PUT(request: NextRequest) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  if (String(user.role).toUpperCase() !== 'DOCTOR') {
    return NextResponse.json({ error: 'Réservé aux médecins' }, { status: 403 });
  }

  const doctorId = user.id != null && String(user.id).trim() !== '' ? String(user.id) : null;
  if (!doctorId) {
    return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
  }

  const rawWeekly =
    body && typeof body === 'object' && body !== null && 'weekly' in body
      ? (body as { weekly: unknown }).weekly
      : body;

  const parsed = weeklyAvailabilitySchema.safeParse(rawWeekly);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors.join(' · ') || 'Données invalides';
    return NextResponse.json({ error: msg, details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const weeklyJson = parsed.data as unknown as Prisma.InputJsonValue;

    const saved = await prisma.availability.upsert({
      where: { doctorId },
      create: {
        doctorId,
        weekly: weeklyJson,
      },
      update: {
        weekly: weeklyJson,
      },
    });

    return NextResponse.json({
      doctorId: saved.doctorId,
      weekly: weeklyFromDb(saved.weekly),
      updatedAt: saved.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error('[PUT /api/doctor/availability]', e);
    return NextResponse.json(
      { error: 'Enregistrement impossible — réessayez ou contactez l’administrateur' },
      { status: 500 }
    );
  }
}
