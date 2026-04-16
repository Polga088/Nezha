import { prisma } from '@/lib/prisma';
import type { StaffContext } from '@/lib/requireStaff';

/**
 * Détermine l’utilisateur User (médecin) à rattacher à l’ordonnance.
 */
export async function resolvePrescribingDoctorId(
  staff: StaffContext,
  bodyDoctorId: unknown
): Promise<string | null> {
  if (staff.role === 'DOCTOR') {
    return staff.id;
  }

  const raw = typeof bodyDoctorId === 'string' ? bodyDoctorId.trim() : '';
  if (raw) {
    const u = await prisma.user.findFirst({
      where: { id: raw, role: 'DOCTOR', isActive: true },
      select: { id: true },
    });
    if (u) return u.id;
  }

  const fallback = await prisma.user.findFirst({
    where: { role: 'DOCTOR', isActive: true },
    orderBy: { nom: 'asc' },
    select: { id: true },
  });
  return fallback?.id ?? null;
}
