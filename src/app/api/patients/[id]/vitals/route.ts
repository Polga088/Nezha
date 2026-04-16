import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import type { NextRequest } from 'next/server';

function computeImc(tailleCm: number, poidsKg: number): number {
  const m = tailleCm / 100;
  if (m <= 0 || !Number.isFinite(m)) return 0;
  return poidsKg / (m * m);
}

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
    }

    const entries = await prisma.patientVitalEntry.findMany({
      where: { patient_id: id },
      orderBy: { recordedAt: 'asc' },
    });

    return NextResponse.json(entries);
  } catch (e) {
    console.error('[GET /api/patients/:id/vitals]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id } = await params;
    const patient = await prisma.patient.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!patient) {
      return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const tailleCm = Number(body.tailleCm ?? body.taille);
    const poidsKg = Number(body.poidsKg ?? body.poids);
    const recordedAtRaw = body.recordedAt as string | undefined;

    if (!Number.isFinite(tailleCm) || !Number.isFinite(poidsKg)) {
      return NextResponse.json({ error: 'Taille et poids numériques requis' }, { status: 400 });
    }
    if (tailleCm < 30 || tailleCm > 250 || poidsKg < 1 || poidsKg > 500) {
      return NextResponse.json({ error: 'Taille (30–250 cm) ou poids (1–500 kg) hors plage' }, { status: 400 });
    }

    const imc = computeImc(tailleCm, poidsKg);
    const recordedAt = recordedAtRaw ? new Date(recordedAtRaw) : new Date();
    if (Number.isNaN(recordedAt.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    const entry = await prisma.patientVitalEntry.create({
      data: {
        patient_id: id,
        recordedAt,
        tailleCm,
        poidsKg,
        imc,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (e) {
    console.error('[POST /api/patients/:id/vitals]', e);
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement' }, { status: 500 });
  }
}
