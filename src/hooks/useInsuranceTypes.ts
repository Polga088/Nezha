'use client';

import useSWR from 'swr';

export type InsuranceTypeOption = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json() as Promise<{ types: InsuranceTypeOption[] }>;
};

/** Types d’assurance actifs (+ type courant patient si includeId). */
export function useInsuranceTypes(includeId?: string | null) {
  const key =
    includeId ?
      `/api/insurance-types?includeId=${encodeURIComponent(includeId)}`
    : '/api/insurance-types';

  const { data, error, isLoading, mutate } = useSWR(key, fetcher, {
    revalidateOnFocus: true,
  });

  return {
    types: data?.types ?? [],
    isLoading,
    error,
    mutate,
  };
}
