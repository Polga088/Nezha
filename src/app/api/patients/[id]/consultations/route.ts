import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { requireStaff } from '@/lib/requireStaff';
import {
  DEFAULT_CONSULTATION_TYPE,
  isConsultationTypeValue,
  normalizeConsultationType,
} from '@/lib/consultation-types';
import type { ConsultationType as PrismaConsultationType } from '@/generated/prisma/client';

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

function parseConsultationDate(raw: unknown): { value: Date | null; error?: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { value: new Date() };
  }
  const date = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(date.getTime())) {
    return { value: null, error: 'Date invalide' };
  }
  if (date.getTime() > Date.now()) {
    return { value: null, error: 'Date future interdite' };
  }
  return { value: date };
}

function parseConsultationType(raw: unknown): { value: PrismaConsultationType; error?: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { value: DEFAULT_CONSULTATION_TYPE };
  }
  if (!isConsultationTypeValue(raw)) {
    return { value: DEFAULT_CONSULTATION_TYPE, error: 'Type de consultation invalide' };
  }
  return { value: normalizeConsultationType(raw) as PrismaConsultationType };
}

function normalizeTextOrNull(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const text = String(raw).trim();
  return text === '' ? null : text;
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
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      include: {
        author: {
          select: {
            id: true,
            nom: true,
            role: true,
          },
        },
      },
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
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;
  if (auth.staff.role !== 'DOCTOR' && auth.staff.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

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
    const consultationType = parseConsultationType(body.type);
    if (consultationType.error) {
      return NextResponse.json({ error: consultationType.error }, { status: 400 });
    }

    const motif = normalizeTextOrNull(body.motif);
    const diagnostic = normalizeTextOrNull(body.diagnostic);
    const notes = normalizeTextOrNull(body.notes);
    const source =
      body.source === 'OUT_OF_APPOINTMENT' ? 'OUT_OF_APPOINTMENT' : 'MANUAL';

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

    const dateParsed = parseConsultationDate(body.date);
    if (dateParsed.error) {
      return NextResponse.json({ error: dateParsed.error }, { status: 400 });
    }

    const hasAny =
      glycemie !== null ||
      battementCoeur !== null ||
      tensionArterielle !== null ||
      motif !== null ||
      diagnostic !== null ||
      notes !== null;

    if (!hasAny) {
      return NextResponse.json(
        { error: 'Renseignez au moins une constante, un diagnostic ou des notes' },
        { status: 400 }
      );
    }

    const row = await prisma.consultation.create({
      data: {
        patientId: id,
        type: consultationType.value,
        motif,
        glycemie,
        tensionArterielle,
        battementCoeur,
        diagnostic,
        notes,
        source,
        authorId: auth.staff.id,
        date: dateParsed.value ?? new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            nom: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    console.error('[POST /api/patients/:id/consultations]', e);
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement' }, { status: 500 });
  }
}
