import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL doit être défini pour utiliser Prisma');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

/**
 * Un seul Pool + PrismaClient réutilisés en dev (HMR) pour éviter d’épuiser les connexions PostgreSQL.
 * En production, le module reste un singleton par instance Node (cache du module).
 */
function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
