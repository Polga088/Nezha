/**
 * Règles RBAC centralisées (middleware / garde API) — finance cabinet.
 * Le médecin accède aux mêmes écrans/API financiers que l’admin (hors gestion des utilisateurs).
 */

/** Dashboard : facturation (dépenses = /dashboard/admin/expenses, alias middleware). */
export const DASHBOARD_FINANCE_PREFIXES = ['/dashboard/invoices'] as const;

export function isDashboardFinancePath(pathname: string): boolean {
  return DASHBOARD_FINANCE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/** Sous-ensemble admin accessible au médecin (analytics, dépenses admin). */
export const DASHBOARD_ADMIN_DOCTOR_PREFIXES = [
  '/dashboard/admin/analytics',
  '/dashboard/admin/expenses',
] as const;

export function isDashboardAdminDoctorPath(pathname: string): boolean {
  return DASHBOARD_ADMIN_DOCTOR_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/** API alignées sur le middleware (finance / analytics médecin). */
export const API_DOCTOR_FINANCE_PREFIXES = [
  '/api/admin/analytics',
  '/api/admin/expenses',
  '/api/expenses',
] as const;
