import { redirect } from 'next/navigation'

/** Ancienne URL « Comptabilité » — navigation unifiée via Sidebar → Dépenses. */
export default function AccountingLegacyPage() {
  redirect('/dashboard/admin/expenses')
}
