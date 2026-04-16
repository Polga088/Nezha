import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaff } from '@/lib/requireStaff';
import { getPusherServer } from '@/lib/pusher-server';

/**
 * Authentification des canaux privés Pusher : `private-user-{userId}`.
 * - JWT staff valide (cookie)
 * - Utilisateur toujours actif en base et rôle ADMIN | DOCTOR | ASSISTANT
 * - Souscription uniquement si `userId` du canal === id JWT
 */
export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const active = await prisma.user.findFirst({
    where: {
      id: auth.staff.id,
      isActive: true,
      role: { in: ['ADMIN', 'DOCTOR', 'ASSISTANT'] },
    },
    select: { id: true },
  });
  if (!active) {
    return NextResponse.json(
      { error: 'Compte inactif ou non autorisé' },
      { status: 403 }
    );
  }

  let socket_id: string | null = null;
  let channel_name: string | null = null;

  const contentType = request.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const json = (await request.json()) as {
        socket_id?: string;
        channel_name?: string;
      };
      socket_id = json.socket_id ?? null;
      channel_name = json.channel_name ?? null;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      socket_id = params.get('socket_id');
      channel_name = params.get('channel_name');
    } else {
      const form = await request.formData();
      socket_id = form.get('socket_id') as string | null;
      channel_name = form.get('channel_name') as string | null;
    }
  } catch {
    return NextResponse.json({ error: 'Corps invalide' }, { status: 400 });
  }

  if (!socket_id || !channel_name) {
    return NextResponse.json(
      { error: 'socket_id et channel_name requis' },
      { status: 400 }
    );
  }

  const match = /^private-user-(.+)$/.exec(channel_name);
  if (!match || match[1] !== auth.staff.id) {
    return NextResponse.json({ error: 'Canal non autorisé' }, { status: 403 });
  }

  const pusher = getPusherServer();
  if (!pusher) {
    return NextResponse.json(
      { error: 'Pusher non configuré côté serveur' },
      { status: 503 }
    );
  }

  const authResponse = pusher.authorizeChannel(socket_id, channel_name);
  return NextResponse.json(authResponse);
}
