import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { parseOptionalFloat, parseSexe } from '@/lib/patient-fields';
import { resolvePatientInsuranceInput } from '@/lib/patient-insurance-resolve';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

const ALLOWED_PAGE_SIZES = new Set([10, 25, 50, 100]);

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

// GET: Liste des patients (Recherche optionnelle via ?q=)
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const searchRaw = searchParams.get('q') ?? searchParams.get('search');
  const searchTerm = searchRaw?.trim() ?? '';
  const pageRaw = searchParams.get('page');
  const pageParsed = pageRaw ? Number.parseInt(pageRaw, 10) : NaN;
  const page = Number.isFinite(pageParsed) && pageParsed > 0 ? pageParsed : 1;

  const pageSizeRaw = searchParams.get('pageSize');
  const parsedPageSize = pageSizeRaw ? Number.parseInt(pageSizeRaw, 10) : NaN;
  const pageSize = ALLOWED_PAGE_SIZES.has(parsedPageSize) ? parsedPageSize : 25;

  const where = buildSearchWhere(searchTerm);

  try {
    const total = await prisma.patient.count({
      where,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;
    const patients = await prisma.patient.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip,
      take: pageSize,
    });

    const from = total === 0 ? 0 : skip + 1;
    const to = total === 0 ? 0 : Math.min(skip + patients.length, total);

    const globalTotal = await prisma.patient.count();

    return NextResponse.json({
      data: patients,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        from,
        to,
        globalTotal,
      },
    });
  } catch (error) {
    console.error('[GET /api/patients]', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des patients' },
      { status: 500 }
    );
  }
}

// POST: Créer un nouveau patient
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      nom,
      prenom,
      date_naissance,
      tel,
      email,
      adresse,
      allergies,
      antecedents,
      cin,
      sexe: sexeRaw,
      groupeSanguin,
      groupe_sanguin,
      taille: tailleRaw,
      poids: poidsRaw,
      assuranceType: assuranceRaw,
      insuranceTypeId: insuranceTypeIdRaw,
      matriculeAssurance: matriculeAssuranceRaw,
    } = body;

    if (!nom || !prenom || !date_naissance) {
      return NextResponse.json(
        { error: 'Nom, prénom et date de naissance sont requis' },
        { status: 400 }
      );
    }

    const sexe = parseSexe(sexeRaw);
    if (sexeRaw !== undefined && sexeRaw !== null && sexeRaw !== '' && sexe === undefined) {
      return NextResponse.json(
        { error: 'Sexe invalide (attendu : MASCULIN ou FEMININ)' },
        { status: 400 }
      );
    }

    const groupe = groupeSanguin ?? groupe_sanguin;
    if (groupe !== undefined && groupe !== null && typeof groupe !== 'string') {
      return NextResponse.json({ error: 'Groupe sanguin invalide' }, { status: 400 });
    }

    const taille = parseOptionalFloat(tailleRaw);
    const poids = parseOptionalFloat(poidsRaw);
    if (taille !== undefined && (taille < 30 || taille > 250)) {
      return NextResponse.json({ error: 'Taille hors plage (30–250 cm)' }, { status: 400 });
    }
    if (poids !== undefined && (poids < 1 || poids > 500)) {
      return NextResponse.json({ error: 'Poids hors plage (1–500 kg)' }, { status: 400 });
    }

    const normalizedInsuranceTypeId =
      insuranceTypeIdRaw === '' || insuranceTypeIdRaw === null
        ? undefined
        : insuranceTypeIdRaw;

    const insuranceResolved = await resolvePatientInsuranceInput({
      insuranceTypeId: normalizedInsuranceTypeId,
      assuranceType: assuranceRaw,
      matriculeAssurance: matriculeAssuranceRaw,
    });
    if (!insuranceResolved.ok) {
      return NextResponse.json(
        { error: insuranceResolved.error },
        { status: insuranceResolved.status }
      );
    }

    const { assuranceType, insuranceTypeId, matriculeAssurance } = insuranceResolved.data;

    const telTrimmed =
      tel === undefined || tel === null ? '' : String(tel).trim();
    const telNormalized = telTrimmed === '' ? undefined : telTrimmed;

    const newPatient = await prisma.patient.create({
      data: {
        nom: String(nom).trim(),
        prenom: String(prenom).trim(),
        date_naissance: new Date(date_naissance),
        tel: telNormalized,
        email: email !== undefined && email !== '' ? String(email) : undefined,
        adresse: adresse !== undefined && adresse !== '' ? String(adresse) : undefined,
        allergies: allergies !== undefined && allergies !== '' ? String(allergies) : undefined,
        antecedents: antecedents !== undefined && antecedents !== '' ? String(antecedents) : undefined,
        cin: cin !== undefined && cin !== '' ? String(cin).trim() : undefined,
        sexe,
        groupeSanguin: groupe !== undefined && groupe !== '' && groupe !== 'INCONNU' ? String(groupe) : undefined,
        taille,
        poids,
        assuranceType,
        insuranceTypeId,
        matriculeAssurance: matriculeAssurance ?? undefined,
      },
    });

    return NextResponse.json(newPatient, { status: 201 });
  } catch (error) {
    console.error('[POST /api/patients]', error);
    return NextResponse.json({ error: 'Erreur lors de la création du patient' }, { status: 500 });
  }
}
