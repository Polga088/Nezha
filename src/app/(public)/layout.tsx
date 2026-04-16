import { PublicHeader } from '@/components/landing/PublicHeader';

/**
 * Layout pages publiques (accueil) : en-tête avec logo cabinet et accès staff.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      <PublicHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
