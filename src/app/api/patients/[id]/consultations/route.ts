import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

const TA_REGEX = /^\d{2,3}\/\d{2,3}$/;

function parseOptionalInt(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseOptionalFloat(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '.'));
  if (!Number.isFinite(n)) return null;
  return n;
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

    const rows = await prisma.consultation.findMany({
      where: { patientId: id },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error('[GET /api/patients/:id/consultations]', e);
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
    const glycemie = parseOptionalFloat(body.glycemie);
    const battementCoeur = parseOptionalInt(body.battementCoeur);
    const tensionRaw = body.tensionArterielle;
    const tensionArterielle =
      tensionRaw === undefined || tensionRaw === null || String(tensionRaw).trim() === ''
        ? null
        : String(tensionRaw).trim();
    const diagnostic =
      body.diagnostic === undefined || body.diagnostic === null
        ? null
        : String(body.diagnostic).trim() || null;
    const notes =
      body.notes === undefined || body.notes === null
        ? null
        : String(body.notes).trim() || null;

    if (tensionArterielle && !TA_REGEX.test(tensionArterielle)) {
      return NextResponse.json(
        { error: 'Tension invalide — utiliser le format xxx/xx (ex. 120/80)' },
        { status: 400 }
      );
    }

    if (glycemie !== null && (glycemie < 20 || glycemie > 600)) {
      return NextResponse.json(
        { error: 'Glycémie hors plage plausible (20–600 mg/dL)' },
        { status: 400 }
      );
    }

    if (battementCoeur !== null && (battementCoeur < 30 || battementCoeur > 250)) {
      return NextResponse.json(
        { error: 'Fréquence cardiaque hors plage (30–250 bpm)' },
        { status: 400 }
      );
    }

    const hasAny =
      glycemie !== null ||
      battementCoeur !== null ||
      tensionArterielle !== null ||
      diagnostic !== null ||
      notes !== null;

    if (!hasAny) {
      return NextResponse.json(
        { error: 'Renseignez au moins une constante, un diagnostic ou des notes' },
        { status: 400 }
      );
    }

    const dateRaw = body.date as string | undefined;
    const date = dateRaw ? new Date(dateRaw) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    const row = await prisma.consultation.create({
      data: {
        patientId: id,
        glycemie,
        tensionArterielle,
        battementCoeur,
        diagnostic,
        notes,
        date,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error('[POST /api/patients/:id/consultations]', e);
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement' }, { status: 500 });
  }
}
