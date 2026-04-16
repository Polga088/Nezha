import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/requireAdmin';

const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_BYTES = 2 * 1024 * 1024;

function sanitizeBaseName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'logo';
}

/** POST multipart `file` — enregistre sous public/uploads/cabinet/ (admin uniquement). */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Fichier image requis' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 2 Mo)' }, { status: 400 });
    }
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED.has(mime)) {
      return NextResponse.json({ error: 'Formats acceptés : PNG, JPEG, WebP' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    const safeBase = sanitizeBaseName(path.basename(file.name, ext));
    const storedName = `logo-${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}${ext || '.png'}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cabinet');
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const absolutePath = path.join(uploadDir, storedName);
    await writeFile(absolutePath, buffer);

    const logoUrl = `/uploads/cabinet/${storedName}`.replace(/\/{2,}/g, '/');
    return NextResponse.json({ logoUrl });
  } catch (e) {
    console.error('[POST /api/admin/settings/logo]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
