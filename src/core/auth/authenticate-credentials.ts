import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';

export type SessionUserPayload = {
  id: string;
  email: string;
  role: string;
  nom: string;
};

export type AuthenticateCredentialsFailure =
  | 'invalid_credentials'
  | 'account_disabled';

export type AuthenticateCredentialsResult =
  | { ok: true; user: SessionUserPayload }
  | { ok: false; error: AuthenticateCredentialsFailure };

/**
 * Authentification par email + mot de passe (logique métier isolée pour réutilisation
 * API, futurs workers ou extraction microservice).
 */
export const authenticateCredentials = async (
  emailNormalized: string,
  password: string
): Promise<AuthenticateCredentialsResult> => {
  const user = await prisma.user.findUnique({
    where: { email: emailNormalized },
  });

  if (!user) {
    return { ok: false, error: 'invalid_credentials' };
  }

  const isValid = await verifyPassword(password, user.password_hash);
  if (!isValid) {
    return { ok: false, error: 'invalid_credentials' };
  }

  if (user.isActive === false) {
    return { ok: false, error: 'account_disabled' };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
    },
  };
};
