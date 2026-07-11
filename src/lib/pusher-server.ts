import Pusher from 'pusher';
import type { PatientCalledPayload } from '@/lib/patient-call-types';
import type { PaymentPendingPayload } from '@/lib/payment-pending-types';
import { prisma } from '@/lib/prisma';

/**
 * Singleton serveur Pusher.
 * Variables requises : `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`.
 */
let server: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    return null;
  }
  if (!server) {
    server = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
  return server;
}

export type NewMessagePushPayload = {
  message: Record<string, unknown>;
  /** Expéditeur (rechargement du fil côté destinataire). */
  senderId: string;
};

/** Événement `new-message` sur `private-user-{receiverId}`. */
export async function triggerNewMessage(
  receiverId: string,
  payload: NewMessagePushPayload
): Promise<void> {
  const p = getPusherServer();
  if (!p) return;
  await p.trigger(`private-user-${receiverId}`, 'new-message', payload);
}

/** Événement `user-status` sur le canal privé de chaque autre membre du staff. */
export async function broadcastUserStatus(payload: {
  userId: string;
  userStatus: string;
  userStatusChangedAt: string;
}): Promise<void> {
  const p = getPusherServer();
  if (!p) return;

  const peers = await prisma.user.findMany({
    where: {
      id: { not: payload.userId },
      isActive: true,
      role: { in: ['ADMIN', 'DOCTOR', 'ASSISTANT'] },
    },
    select: { id: true },
  });

  const BATCH = 10;
  for (let i = 0; i < peers.length; i += BATCH) {
    const slice = peers.slice(i, i + BATCH);
    await p.triggerBatch(
      slice.map((peer) => ({
        channel: `private-user-${peer.id}`,
        name: 'user-status',
        data: payload,
      }))
    );
  }
}

/** Signal discret de l’assistante vers le médecin (`assistant-signal`). */
export async function triggerAssistantSignal(
  doctorId: string,
  payload: { assistantName: string; assistantId: string; sentAt: string }
): Promise<void> {
  const p = getPusherServer();
  if (!p) return;
  await p.trigger(`private-user-${doctorId}`, 'assistant-signal', payload);
}

/**
 * Le médecin appelle un patient depuis la file — notifie accueil / admin (`patient-called`).
 */
export async function triggerPatientCalled(payload: PatientCalledPayload): Promise<void> {
  const p = getPusherServer();
  if (!p) return;

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['ASSISTANT', 'ADMIN'] },
    },
    select: { id: true },
  });

  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    await p.triggerBatch(
      slice.map((u) => ({
        channel: `private-user-${u.id}`,
        name: 'patient-called',
        data: payload,
      }))
    );
  }
}

/** Clôture médecin — encaissement à traiter (`payment-pending`) vers accueil / admin. */
export async function triggerPaymentPending(
  payload: PaymentPendingPayload,
  notificationIdByUserId?: Map<string, string>
): Promise<void> {
  const p = getPusherServer();
  if (!p) return;

  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ['ASSISTANT', 'ADMIN'] },
    },
    select: { id: true },
  });

  const BATCH = 10;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const slice = recipients.slice(i, i + BATCH);
    await p.triggerBatch(
      slice.map((u) => {
        const notificationId = notificationIdByUserId?.get(u.id);
        return {
          channel: `private-user-${u.id}`,
          name: 'payment-pending',
          data: {
            ...payload,
            ...(notificationId ? { notificationId } : {}),
          } satisfies PaymentPendingPayload,
        };
      })
    );
  }
}
