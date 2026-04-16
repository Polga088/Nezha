import { ReactNode } from 'react';

/**
 * Les routes /dashboard/admin/* héritent uniquement du layout dashboard (sidebar Elite).
 * Ancienne colonne « Pilotage financier » supprimée — navigation via Sidebar principale.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
