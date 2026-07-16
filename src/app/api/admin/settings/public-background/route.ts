import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'public-hero');

function sanitizeBaseName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 120) || 'hero';
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const mode = String(formData.get('mode') ?? 'image').toUpperCase();
    const altText = String(formData.get('altText') ?? '').trim() || null;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Fichier image requis' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image trop volumineuse (max 5 Mo)' }, { status: 400 });
    }
    const mime = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      return NextResponse.json({ error: 'Formats acceptés : PNG, JPEG, WebP' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase() || '.png';
    const safeBase = sanitizeBaseName(path.basename(file.name, ext));
    const storedName = `public-hero-${Date.now()}-${randomUUID().slice(0, 8)}-${safeBase}${ext}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));

    const imageUrl = `/uploads/public-hero/${storedName}`.replace(/\/{2,}/g, '/');
    if (mode === 'SLIDE') {
      const currentCount = await prisma.publicHeroSlide.count({
        where: { settingsId: 'default' },
      });
      if (currentCount >= 5) {
        return NextResponse.json({ error: 'Maximum 5 images pour le slider' }, { status: 400 });
      }
      const position = currentCount;
      const slide = await prisma.publicHeroSlide.create({
        data: {
          settingsId: 'default',
          imageUrl,
          altText,
          position,
          isActive: true,
        },
        select: {
          id: true,
          imageUrl: true,
          altText: true,
          position: true,
          isActive: true,
        },
      });
      return NextResponse.json({ slide });
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('[POST /api/admin/settings/public-background]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
