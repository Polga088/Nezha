'use client';

import Pusher from 'pusher-js';

/** URL d’auth relative : même origine que la page (ex. http://localhost:3001). */
export const PUSHER_AUTH_ENDPOINT = '/api/pusher/auth';

let client: Pusher | null = null;

/**
 * Singleton navigateur — canaux privés via `PUSHER_AUTH_ENDPOINT` (cookie `auth_token`).
 * `NEXT_PUBLIC_PUSHER_KEY` et `NEXT_PUBLIC_PUSHER_CLUSTER` doivent correspondre au tableau Pusher.
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  if (!key) return null;

  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'eu';

  if (!client) {
    client = new Pusher(key, {
      cluster,
      forceTLS: true,
      channelAuthorization: {
        endpoint: PUSHER_AUTH_ENDPOINT,
        transport: 'ajax',
      },
    });
  }

  return client;
}

export function disconnectPusherClient(): void {
  if (client) {
    client.disconnect();
    client = null;
  }
}
