import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

function buildSearchWhere(searchTerm: string) {
  const words = searchTerm.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return undefined;

  return {
    AND: words.map((word) => ({
      OR: [
        { nom: { contains: word, mode: 'insensitive' as const } },
        { prenom: { contains: word, mode: 'insensitive' as const } },
        { cin: { contains: word, mode: 'insensitive' as const } },
        { tel: { contains: word, mode: 'insensitive' as const } },
        { email: { contains: word, mode: 'insensitive' as const } },
      ],
    })),
  };
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 2) {
    return NextResponse.json({ data: [] });
  }

  try {
    const rows = await prisma.patient.findMany({
      where: buildSearchWhere(query),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 20,
      select: {
        id: true,
        nom: true,
        prenom: true,
        tel: true,
        cin: true,
        date_naissance: true,
      },
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('[GET /api/patients/search]', error);
    return NextResponse.json({ error: 'Erreur lors de la recherche des patients' }, { status: 500 });
  }
}
