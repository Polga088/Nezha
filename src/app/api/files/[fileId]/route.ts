import { readFile } from 'fs/promises';
import path from 'path';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeFileId(raw: string): string {
  const t = decodeURIComponent(String(raw).trim());
  return UUID_RE.test(t) ? t.toLowerCase() : t;
}

function mimeFromName(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
  };
  return map[ext] ?? 'application/octet-stream';
}

/** Résout un chemin fichier patient sous `public/uploads/patients/` (anti path traversal). */
function resolvePatientUploadFile(fileUrl: string | null | undefined): string | null {
  if (!fileUrl || typeof fileUrl !== 'string') return null;
  const u = fileUrl.trim();
  if (!u.startsWith('/uploads/patients/') || u.includes('..')) return null;

  const publicRoot = path.resolve(process.cwd(), 'public');
  const patientsRoot = path.resolve(publicRoot, 'uploads', 'patients');
  const relativeFromPublic = u.replace(/^\//, '');
  const absolute = path.resolve(publicRoot, relativeFromPublic);

  if (!absolute.startsWith(patientsRoot)) return null;
  return absolute;
}

/**
 * GET /api/files/[fileId] — sert le binaire avec les bons en-têtes (auth staff + document patient).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const user = await getUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const role = String(user.role).toUpperCase();
  if (role !== 'ADMIN' && role !== 'DOCTOR' && role !== 'ASSISTANT') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  const { fileId: rawId } = await params;
  const fileId = normalizeFileId(rawId);
  if (!UUID_RE.test(fileId)) {
    return NextResponse.json({ error: 'Identifiant fichier invalide' }, { status: 400 });
  }

  try {
    const doc = await prisma.patientDocument.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        file_url: true,
        patient_id: true,
      },
    });

    if (!doc?.file_url) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    const absPath = resolvePatientUploadFile(doc.file_url);
    if (!absPath) {
      return NextResponse.json({ error: 'Chemin de fichier invalide' }, { status: 400 });
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(absPath);
    } catch {
      return NextResponse.json({ error: 'Fichier absent sur le disque' }, { status: 404 });
    }

    const contentType =
      doc.mimeType && doc.mimeType.trim().length > 0
        ? doc.mimeType.trim()
        : mimeFromName(doc.filename);

    const asciiName = doc.filename.replace(/[^\x20-\x7E]/g, '_');
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Length', String(buffer.length));
    headers.set('Cache-Control', 'private, no-store');
    headers.set(
      'Content-Disposition',
      `inline; filename="${asciiName.replace(/"/g, '')}"`
    );

    return new NextResponse(new Uint8Array(buffer), { status: 200, headers });
  } catch (e) {
    console.error('[GET /api/files/:fileId]', e);
    return NextResponse.json({ error: 'Erreur lecture fichier' }, { status: 500 });
  }
}
