import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const ROLES = ['ADMIN', 'DOCTOR', 'ASSISTANT'] as const;
type RoleValue = (typeof ROLES)[number];

function isRole(s: unknown): s is RoleValue {
  return typeof s === 'string' && ROLES.includes(s as RoleValue);
}

const selectPublic = {
  id: true,
  nom: true,
  email: true,
  role: true,
  specialite: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * PUT /api/admin/users/[id] — mise à jour : nom, email, rôle, isActive (champs partiels, au moins un requis).
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;
  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 });

  try {
    const body = await request.json();
    const nomIn = 'nom' in body ? body.nom : undefined;
    const emailIn = 'email' in body ? body.email : undefined;
    const roleIn = 'role' in body ? body.role : undefined;
    const isActiveIn = 'isActive' in body ? body.isActive : undefined;
    const specialiteIn = 'specialite' in body ? body.specialite : undefined;

    if (
      nomIn === undefined &&
      emailIn === undefined &&
      roleIn === undefined &&
      isActiveIn === undefined &&
      specialiteIn === undefined
    ) {
      return NextResponse.json(
        { error: 'Fournir au moins nom, email, role, specialite ou isActive' },
        { status: 400 }
      );
    }

    if (nomIn !== undefined && (typeof nomIn !== 'string' || !nomIn.trim())) {
      return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
    }
    if (emailIn !== undefined) {
      if (typeof emailIn !== 'string' || !emailIn.trim()) {
        return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
      }
    }
    if (roleIn !== undefined && !isRole(roleIn)) {
      return NextResponse.json(
        { error: 'Rôle invalide (ADMIN, DOCTOR ou ASSISTANT)' },
        { status: 400 }
      );
    }
    if (isActiveIn !== undefined && typeof isActiveIn !== 'boolean') {
      return NextResponse.json({ error: 'isActive doit être un booléen' }, { status: 400 });
    }
    if (
      specialiteIn !== undefined &&
      specialiteIn !== null &&
      typeof specialiteIn !== 'string'
    ) {
      return NextResponse.json({ error: 'Spécialité invalide' }, { status: 400 });
    }

    if (id === auth.admin.id) {
      if (isActiveIn === false) {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas désactiver votre propre compte.' },
          { status: 400 }
        );
      }
      if (roleIn !== undefined && roleIn !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas retirer votre rôle administrateur à vous-même.' },
          { status: 400 }
        );
      }
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const email =
      emailIn !== undefined ? String(emailIn).trim().toLowerCase() : undefined;
    if (email !== undefined) {
      const dup = await prisma.user.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
      if (dup) {
        return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
      }
    }

    const nextRole: RoleValue =
      roleIn !== undefined ? roleIn : (target.role as RoleValue);

    const data: {
      nom?: string;
      email?: string;
      role?: RoleValue;
      isActive?: boolean;
      specialite?: string | null;
    } = {};
    if (nomIn !== undefined) data.nom = String(nomIn).trim();
    if (email !== undefined) data.email = email;
    if (roleIn !== undefined) data.role = roleIn;
    if (isActiveIn !== undefined) data.isActive = isActiveIn;

    if (nextRole !== 'DOCTOR') {
      if (roleIn !== undefined || specialiteIn !== undefined) {
        data.specialite = null;
      }
    } else if (specialiteIn !== undefined) {
      const s =
        specialiteIn === null
          ? null
          : String(specialiteIn).trim();
      data.specialite = s && s.length > 0 ? s : null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: selectPublic,
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error('[admin/users] PUT', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** PATCH /api/admin/users/[id] — rôle et/ou isActive (rétrocompatibilité) */
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

  try {
    const body = await request.json();
    const roleIn = 'role' in body ? body.role : undefined;
    const isActiveIn = 'isActive' in body ? body.isActive : undefined;

    if (roleIn === undefined && isActiveIn === undefined) {
      return NextResponse.json(
        { error: 'Fournir au moins role ou isActive' },
        { status: 400 }
      );
    }

    if (roleIn !== undefined && !isRole(roleIn)) {
      return NextResponse.json(
        { error: 'Rôle invalide (ADMIN, DOCTOR ou ASSISTANT)' },
        { status: 400 }
      );
    }
    if (isActiveIn !== undefined && typeof isActiveIn !== 'boolean') {
      return NextResponse.json({ error: 'isActive doit être un booléen' }, { status: 400 });
    }

    if (id === auth.admin.id) {
      if (isActiveIn === false) {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas désactiver votre propre compte.' },
          { status: 400 }
        );
      }
      if (roleIn !== undefined && roleIn !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Vous ne pouvez pas retirer votre rôle administrateur à vous-même.' },
          { status: 400 }
        );
      }
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    const nextRole: RoleValue =
      roleIn !== undefined ? roleIn : (target.role as RoleValue);

    const data: { role?: RoleValue; isActive?: boolean; specialite?: string | null } = {};
    if (roleIn !== undefined) data.role = roleIn;
    if (isActiveIn !== undefined) data.isActive = isActiveIn;
    if (roleIn !== undefined && nextRole !== 'DOCTOR') {
      data.specialite = null;
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: selectPublic,
    });

    return NextResponse.json(user);
  } catch (e) {
    console.error('[admin/users] PATCH', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/** DELETE /api/admin/users/[id] — suppression (données liées : RDV, etc. peuvent bloquer) */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  if (id === auth.admin.id) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas supprimer votre propre compte.' },
      { status: 400 }
    );
  }

  try {
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    if (target.role === 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Impossible de supprimer le dernier administrateur.' },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code === 'P2003') {
      return NextResponse.json(
        {
          error:
            'Suppression impossible : cet utilisateur est lié à des rendez-vous ou d’autres enregistrements.',
        },
        { status: 409 }
      );
    }
    console.error('[admin/users] DELETE', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
