'use client';

import { AdminStaffSection } from '@/components/admin/AdminStaffSection';

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-7xl animate-fade-in">
      <div className="grid gap-6 lg:grid-cols-12">
        <header className="rounded-xl border border-outline-variant/15 bg-container-lowest p-6 shadow-medical lg:col-span-12">
          <h1 className="text-3xl font-semibold tracking-tight text-on-surface">Utilisateurs</h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Gestion des comptes staff — rôles, spécialités et accès à la plateforme
          </p>
        </header>

        <section className="rounded-xl border border-outline-variant/15 bg-container-low p-6 shadow-medical lg:col-span-12">
          <AdminStaffSection variant="page" />
        </section>
      </div>
    </div>
  );
}
