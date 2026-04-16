'use client';

import useSWR from 'swr';

export const ADMIN_SETTINGS_KEY = '/api/admin/settings';

export type AdminSettings = {
  id: string;
  currency: string;
  defaultConsultationPrice: number;
  acceptedPaymentMethods: string[];
  updatedAt: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('settings');
  return res.json() as Promise<AdminSettings>;
};

/**
 * Charge les paramètres cabinet (GET /api/admin/settings).
 * @param enabled — typiquement `modalOpen` pour ne fetch qu’à l’ouverture.
 */
export function useSettings(enabled: boolean) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    enabled ? ADMIN_SETTINGS_KEY : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 0,
    }
  );

  return {
    settings: data,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
