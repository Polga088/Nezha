import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { requireAdmin } from '@/lib/requireAdmin';
import { generateTemporaryPassword } from '@/lib/tempPassword';
import { sendMail } from '@/lib/mail';
import { getAppBaseUrl } from '@/lib/app-url';

const ROLES = ['ADMIN', 'DOCTOR', 'ASSISTANT'] as const;
type RoleValue = (typeof ROLES)[number];

function isRole(s: unknown): s is RoleValue {
  return typeof s === 'string' && ROLES.includes(s as RoleValue);
}

/** GET /api/admin/users — liste (sans mot de passe) */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      nom: true,
      email: true,
      role: true,
      specialite: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(users);
}

/** POST /api/admin/users — création */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const passwordRaw = typeof body.password === 'string' ? body.password : '';
    const role = body.role;

    if (!nom || !email) {
      return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 });
    }
    if (!isRole(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide (ADMIN, DOCTOR ou ASSISTANT)' },
        { status: 400 }
      );
    }

    const specialiteRaw =
      typeof body.specialite === 'string' ? body.specialite.trim() : '';
    const specialite =
      role === 'DOCTOR' && specialiteRaw.length > 0 ? specialiteRaw : null;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const useGenerated = !passwordRaw || passwordRaw.length < 8;
    const plain = useGenerated ? generateTemporaryPassword() : passwordRaw;
    const password_hash = await hashPassword(plain);

    const inviteToken = randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        nom,
        email,
        password_hash,
        role,
        specialite,
        isActive: true,
        passwordResetToken: inviteToken,
        passwordResetExpires: inviteExpires,
      },
      select: {
        id: true,
        nom: true,
        email: true,
        role: true,
        specialite: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      let cabinetLabel = 'Nezha Medical';
      try {
        const gs = await prisma.globalSettings.findUnique({
          where: { id: 'default' },
          select: { cabinetName: true },
        });
        if (gs?.cabinetName?.trim()) cabinetLabel = gs.cabinetName.trim();
      } catch {
        /* ignore */
      }

      const base = getAppBaseUrl();
      const setPasswordUrl = `${base}/reset-password?token=${encodeURIComponent(inviteToken)}`;
      const loginUrl = `${base}/login`;

      const lines: string[] = [
        `Bonjour ${nom},`,
        '',
        `Un compte personnel vous a été créé sur ${cabinetLabel}.`,
        '',
        `Identifiant (e-mail de connexion) : ${email}`,
        '',
      ];

      if (useGenerated) {
        lines.push(`Mot de passe provisoire : ${plain}`);
        lines.push(
          '(À conserver confidentiellement ; vous pouvez le remplacer immédiatement via le lien ci-dessous.)'
        );
      } else {
        lines.push(
          'Un mot de passe initial a été défini par l’administrateur (non indiqué dans cet e-mail).'
        );
      }

      lines.push(
        '',
        `Pour définir un nouveau mot de passe personnel (lien sécurisé, valable 7 jours) :`,
        setPasswordUrl,
        '',
        `Page de connexion :`,
        loginUrl,
        '',
        'Si vous n’êtes pas concerné par ce message, ignorez-le.',
      );

      await sendMail({
        to: email,
        subject: `${cabinetLabel} — Votre accès équipe`,
        text: lines.join('\n'),
      });
    } catch (mailErr) {
      console.error('[admin/users] POST — envoi e-mail accueil', mailErr);
    }

    return NextResponse.json({
      user,
      temporaryPassword: useGenerated ? plain : undefined,
    });
  } catch (e) {
    console.error('[admin/users] POST', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
