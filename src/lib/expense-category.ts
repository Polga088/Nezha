import type { ExpenseCategory } from '@/generated/prisma/client';

/** Libellés FR pour l’enum Prisma `ExpenseCategory`. */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  LOYER: 'Loyer',
  MATERIEL: 'Matériel',
  SALAIRE: 'Salaire',
  AUTRE: 'Autre',
}

export const EXPENSE_CATEGORY_VALUES: ExpenseCategory[] = [
  'LOYER',
  'MATERIEL',
  'SALAIRE',
  'AUTRE',
]
