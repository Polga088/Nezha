import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import { requireStaff } from '@/lib/requireStaff';
import {
  isConsultationTypeValue,
  normalizeConsultationType,
} from '@/lib/consultation-types';
import type { ConsultationType as PrismaConsultationType } from '@/generated/prisma/client';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

function parseConsultationDate(raw: unknown): { value: Date | null; error?: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { value: null };
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

function parseConsultationType(raw: unknown): { value: PrismaConsultationType | null; error?: string } {
  if (raw === undefined || raw === null || raw === '') {
    return { value: null };
  }
  if (!isConsultationTypeValue(raw)) {
    return { value: null, error: 'Type de consultation invalide' };
  }
  return { value: normalizeConsultationType(raw) as PrismaConsultationType };
}

function normalizeTextOrNull(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const text = String(raw).trim();
  return text === '' ? null : text;
}

function parseOptionalInt(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseOptionalFloat(v: unknown): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '.'));
  if (!Number.isFinite(n)) return null;
  return n;
}

const TA_REGEX = /^\d{2,3}\/\d{2,3}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; consultationId: string }> }
) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;
  if (auth.staff.role !== 'DOCTOR' && auth.staff.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  try {
    const { id, consultationId } = await params;
    const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
    }

    const consultation = await prisma.consultation.findFirst({
      where: { id: consultationId, patientId: id },
    });
    if (!consultation) {
      return NextResponse.json({ error: 'Consultation introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const typeValue = parseConsultationType(body.type);
    if (typeValue.error) {
      return NextResponse.json({ error: typeValue.error }, { status: 400 });
    }
    const dateParsed = parseConsultationDate(body.date);
    if (dateParsed.error) {
      return NextResponse.json({ error: dateParsed.error }, { status: 400 });
    }

    const motif = normalizeTextOrNull(body.motif);
    const diagnostic = normalizeTextOrNull(body.diagnostic);
    const notes = normalizeTextOrNull(body.notes);
    const glycemie = parseOptionalFloat(body.glycemie);
    const battementCoeur = parseOptionalInt(body.battementCoeur);
    const tensionRaw = body.tensionArterielle;
    const tensionArterielle =
      tensionRaw === undefined
        ? undefined
        : tensionRaw === null || String(tensionRaw).trim() === ''
          ? null
          : String(tensionRaw).trim();

    if (tensionArterielle && !TA_REGEX.test(tensionArterielle)) {
      return NextResponse.json(
        { error: 'Tension invalide — utiliser le format xxx/xx (ex. 120/80)' },
        { status: 400 }
      );
    }

    const hasAny =
      (glycemie !== undefined && glycemie !== null) ||
      (battementCoeur !== undefined && battementCoeur !== null) ||
      (tensionArterielle !== undefined && tensionArterielle !== null) ||
      motif !== undefined ||
      diagnostic !== undefined ||
      notes !== undefined ||
      dateParsed.value !== null ||
      typeValue.value !== null;

    if (!hasAny) {
      return NextResponse.json(
        { error: 'Renseignez au moins un type, un motif, une note ou un diagnostic' },
        { status: 400 }
      );
    }

    const updated = await prisma.consultation.update({
      where: { id: consultationId },
      data: {
        ...(typeValue.value ? { type: typeValue.value } : {}),
        ...(motif !== undefined ? { motif } : {}),
        ...(diagnostic !== undefined ? { diagnostic } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(dateParsed.value ? { date: dateParsed.value } : {}),
        ...(glycemie !== undefined ? { glycemie } : {}),
        ...(battementCoeur !== undefined ? { battementCoeur } : {}),
        ...(tensionArterielle !== undefined ? { tensionArterielle } : {}),
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[PATCH /api/patients/:id/consultations/:consultationId]', error);
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}
