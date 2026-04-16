import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import type { NextRequest } from 'next/server';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

function sanitizeBaseName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 180) || 'file';
}

/** Liste des documents importés pour le dossier patient */
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

    const docs = await prisma.patientDocument.findMany({
      where: { patient_id: id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(docs);
  } catch (e) {
    console.error('[GET /api/patients/:id/documents]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * Enregistre le fichier sous `public/uploads/patients/<patientId>/`
 * et stocke l’URL publique `/uploads/patients/<patientId>/<fichier>` en base.
 */
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

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
    }

    const label = (formData.get('label') as string | null)?.trim() || null;

    const ext = path.extname(file.name).toLowerCase();
    const safeBase = sanitizeBaseName(path.basename(file.name, ext));
    const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}${ext || ''}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'patients', id);
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const absolutePath = path.join(uploadDir, storedName);
    await writeFile(absolutePath, buffer);

    /** Chemin public relatif à la racine du site (dossier `public/` → URL `/...`) */
    const fileUrl = `/uploads/patients/${id}/${storedName}`.replace(/\/{2,}/g, '/');

    const doc = await prisma.patientDocument.create({
      data: {
        patient_id: id,
        filename: file.name,
        mimeType: file.type || null,
        file_url: fileUrl,
        label: label || null,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (e) {
    console.error('[POST /api/patients/:id/documents]', e);
    return NextResponse.json(
      { error: 'Erreur lors de l’enregistrement du document' },
      { status: 500 }
    );
  }
}
