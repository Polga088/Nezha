import { unlink } from 'fs/promises';
import path from 'path';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeId(raw: string): string {
  const trimmed = decodeURIComponent(String(raw).trim());
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : trimmed;
}

function resolvePatientUploadFile(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const trimmed = fileUrl.trim();
  if (!trimmed.startsWith('/uploads/patients/') || trimmed.includes('..')) return null;

  const publicRoot = path.resolve(process.cwd(), 'public');
  const patientsRoot = path.resolve(publicRoot, 'uploads', 'patients');
  const absolute = path.resolve(publicRoot, trimmed.replace(/^\//, ''));

  if (!absolute.startsWith(patientsRoot)) return null;
  return absolute;
}

async function findDocument(patientId: string, documentId: string) {
  return prisma.patientDocument.findFirst({
    where: { id: documentId, patient_id: patientId },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const { id: rawPatientId, documentId: rawDocumentId } = await params;
  const patientId = normalizeId(rawPatientId);
  const documentId = normalizeId(rawDocumentId);

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Identifiant document invalide' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const label =
    typeof body?.label === 'string'
      ? body.label.trim()
      : '';

  if (!label) {
    return NextResponse.json({ error: 'Nom lisible requis' }, { status: 400 });
  }

  const existing = await findDocument(patientId, documentId);
  if (!existing) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  const doc = await prisma.patientDocument.update({
    where: { id: documentId },
    data: { label },
  });

  return NextResponse.json(doc);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const { id: rawPatientId, documentId: rawDocumentId } = await params;
  const patientId = normalizeId(rawPatientId);
  const documentId = normalizeId(rawDocumentId);

  if (!UUID_RE.test(documentId)) {
    return NextResponse.json({ error: 'Identifiant document invalide' }, { status: 400 });
  }

  const existing = await findDocument(patientId, documentId);
  if (!existing) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  const absolutePath = resolvePatientUploadFile(existing.file_url);
  if (absolutePath) {
    await unlink(absolutePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }

  await prisma.patientDocument.delete({ where: { id: documentId } });

  return new NextResponse(null, { status: 204 });
}
