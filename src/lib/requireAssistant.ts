import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/requireStaff';

/** JWT staff + rôle ASSISTANT uniquement. */
export async function requireAssistant(
  request: NextRequest
): Promise<
  | { ok: true; assistant: { id: string; email: string; nom: string } }
  | { ok: false; response: NextResponse }
> {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth;
  if (auth.staff.role !== 'ASSISTANT') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Réservé au personnel d\'accueil' }, { status: 403 }),
    };
  }
  return {
    ok: true,
    assistant: {
      id: auth.staff.id,
      email: auth.staff.email,
      nom: auth.staff.nom,
    },
  };
}
