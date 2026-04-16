import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { requireAdmin } from '@/lib/requireAdmin';

const MAX_PASSWORD_BYTES = 72;

/** PATCH /api/admin/users/[id]/password — définition manuelle du mot de passe (admin uniquement). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  const password =
    typeof body === 'object' && body !== null && 'password' in body
      ? String((body as { password: unknown }).password).trim()
      : '';

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Le mot de passe doit contenir au moins 8 caractères' },
      { status: 400 }
    );
  }

  if (Buffer.from(password, 'utf8').length > MAX_PASSWORD_BYTES) {
    return NextResponse.json(
      { error: 'Mot de passe trop long (limite technique 72 octets)' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const password_hash = await hashPassword(password);

    await prisma.user.update({
      where: { id },
      data: {
        password_hash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    console.info(
      '[AUDIT]',
      JSON.stringify({
        event: 'ADMIN_MANUAL_PASSWORD_CHANGE',
        targetUserId: id,
        targetUserEmail: existing.email,
        adminUserId: auth.admin.id,
        adminEmail: auth.admin.email,
        at: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      message: 'Mot de passe mis à jour',
      userId: id,
    });
  } catch (e) {
    console.error('[PATCH /api/admin/users/[id]/password]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
