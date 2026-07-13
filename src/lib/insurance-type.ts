import type { AssuranceType } from '@/generated/prisma/client';

const ASSURANCE_ENUM: AssuranceType[] = [
  'AUCUNE',
  'CNSS',
  'CNOPS',
  'FAR',
  'RAMID',
  'MUTUELLE_PRIVEE',
  'AUTRE',
];

export function mapCodeToEnum(code: string): AssuranceType {
  if ((ASSURANCE_ENUM as string[]).includes(code)) return code as AssuranceType;
  return 'AUTRE';
}
