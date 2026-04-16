import { ReactNode } from 'react';

/**
 * Navigation unique : barre latérale globale (`dashboard/layout`).
 * Ancien menu « Espace Praticien » retiré pour éviter la duplication avec la sidebar.
 */
export default function DoctorLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
