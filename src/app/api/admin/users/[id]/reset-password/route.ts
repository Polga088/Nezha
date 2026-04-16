import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { requireAdmin } from '@/lib/requireAdmin';
import { generateTemporaryPassword } from '@/lib/tempPassword';

/** POST /api/admin/users/[id]/reset-password — mot de passe provisoire */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const password_hash = await hashPassword(temporaryPassword);

    await prisma.user.update({
      where: { id },
      data: {
        password_hash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    return NextResponse.json({
      message: 'Mot de passe réinitialisé',
      temporaryPassword,
      userId: id,
      email: user.email,
    });
  } catch (e) {
    console.error('[admin/users/reset-password] POST', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
