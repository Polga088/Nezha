import { prisma } from '@/lib/prisma';
import type { AssuranceType } from '@/generated/prisma/client';
import { parseAssuranceType } from '@/lib/patient-fields';

const ASSURANCE_ENUM = new Set<string>([
  'AUCUNE',
  'CNSS',
  'CNOPS',
  'FAR',
  'RAMID',
  'MUTUELLE_PRIVEE',
  'AUTRE',
]);

export function insuranceCodeToPatientAssuranceType(code: string): AssuranceType {
  const normalizedCode = String(code).trim().toUpperCase();
  if (ASSURANCE_ENUM.has(normalizedCode)) return normalizedCode as AssuranceType;

  // Legacy enum only: dynamic insurance rows stay linked through insuranceTypeId.
  return 'AUCUNE';
}

export type ResolvedPatientInsurance = {
  assuranceType: AssuranceType;
  insuranceTypeId: string | null;
  matriculeAssurance?: string | null;
};

/** Résout assurance depuis insuranceTypeId (prioritaire) ou legacy assuranceType enum. */
export async function resolvePatientInsuranceInput(input: {
  insuranceTypeId?: unknown;
  assuranceType?: unknown;
  matriculeAssurance?: unknown;
  /** Autorise un type inactif déjà lié au dossier (édition patient). */
  allowInactiveId?: string | null;
}): Promise<
  | { ok: true; data: ResolvedPatientInsurance }
  | { ok: false; error: string; status: number }
> {
  const matricule =
    input.matriculeAssurance !== undefined &&
    input.matriculeAssurance !== null &&
    String(input.matriculeAssurance).trim() !== ''
      ? String(input.matriculeAssurance).trim().slice(0, 200)
      : input.matriculeAssurance === null || input.matriculeAssurance === ''
        ? null
        : undefined;

  const insuranceTypeIdRaw = input.insuranceTypeId;

  if (
    insuranceTypeIdRaw !== undefined &&
    insuranceTypeIdRaw !== null &&
    String(insuranceTypeIdRaw).trim() !== ''
  ) {
    const id = String(insuranceTypeIdRaw).trim();
    const row = await prisma.insuranceType.findUnique({ where: { id } });
    if (!row) {
      return { ok: false, error: 'Type d’assurance introuvable', status: 400 };
    }
    if (!row.isActive && row.id !== input.allowInactiveId) {
      return { ok: false, error: 'Ce type d’assurance est inactif', status: 400 };
    }
    return {
      ok: true,
      data: {
        assuranceType: insuranceCodeToPatientAssuranceType(row.code),
        insuranceTypeId: row.id,
        ...(matricule !== undefined ? { matriculeAssurance: matricule } : {}),
      },
    };
  }

  if (insuranceTypeIdRaw === null || insuranceTypeIdRaw === '') {
    const aucune = await prisma.insuranceType.findFirst({
      where: { code: 'AUCUNE', isActive: true },
      select: { id: true },
    });
    return {
      ok: true,
      data: {
        assuranceType: 'AUCUNE',
        insuranceTypeId: aucune?.id ?? null,
        matriculeAssurance: matricule === undefined ? null : matricule,
      },
    };
  }

  if (input.assuranceType !== undefined && input.assuranceType !== null && input.assuranceType !== '') {
    const parsed = parseAssuranceType(input.assuranceType);
    if (parsed === undefined) {
      return { ok: false, error: 'Type d’assurance invalide', status: 400 };
    }
    const row = await prisma.insuranceType.findFirst({
      where: { code: parsed },
      select: { id: true },
    });
    return {
      ok: true,
      data: {
        assuranceType: parsed,
        insuranceTypeId: row?.id ?? null,
        ...(matricule !== undefined ? { matriculeAssurance: matricule } : {}),
      },
    };
  }

  return {
    ok: true,
    data: {
      assuranceType: 'AUCUNE',
      insuranceTypeId: null,
      ...(matricule !== undefined ? { matriculeAssurance: matricule } : {}),
    },
  };
}
