import { unlink } from 'fs/promises';
import path from 'path';

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

function resolveImagePath(imageUrl: string): string | null {
  const trimmed = imageUrl.trim();
  if (!trimmed.startsWith('/uploads/public-hero/') || trimmed.includes('..')) return null;
  const publicRoot = path.join(process.cwd(), 'public');
  return path.resolve(publicRoot, `.${trimmed}`);
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(_request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  try {
    const slide = await prisma.publicHeroSlide.findUnique({
      where: { id },
      select: { id: true, imageUrl: true },
    });
    if (slide) {
      const absolutePath = resolveImagePath(slide.imageUrl);
      if (absolutePath) {
        await unlink(absolutePath).catch(() => null);
      }

      await prisma.publicHeroSlide.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    const decoded = (() => {
      try {
        return decodeURIComponent(id);
      } catch {
        return id;
      }
    })();
    const absolutePath = resolveImagePath(decoded);
    if (!absolutePath) {
      return NextResponse.json({ error: 'Image introuvable' }, { status: 404 });
    }
    await unlink(absolutePath).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[DELETE /api/admin/settings/public-background/[id]]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
