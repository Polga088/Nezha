import { NextResponse } from 'next/server';
import {
  signJwt,
  AUTH_SESSION_MAX_AGE_SEC,
} from '@/lib/auth';
import { authenticateCredentials } from '@/core/auth/authenticate-credentials';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const emailNormalized =
      typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!emailNormalized) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const result = await authenticateCredentials(emailNormalized, password);

    if (!result.ok) {
      if (result.error === 'account_disabled') {
        return NextResponse.json(
          { error: 'Compte désactivé. Contactez un administrateur.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const payload = {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      nom: result.user.nom,
    };

    const token = await signJwt(payload);

    const response = NextResponse.json({
      message: 'Connexion réussie',
      user: payload
    });

    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_SESSION_MAX_AGE_SEC,
    });

    return response;

  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
