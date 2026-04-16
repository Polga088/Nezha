import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import type { AssuranceType } from '@/generated/prisma/client';
import { parseAssuranceType, parseOptionalFloat, parseSexe } from '@/lib/patient-fields';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

// GET: Liste des patients (Recherche optionnelle via ?q=)
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const searchRaw = searchParams.get('q') ?? searchParams.get('search');
  const searchTerm = searchRaw?.trim() ?? '';
  const limitRaw = searchParams.get('limit');
  const parsedLimit = limitRaw ? Number.parseInt(limitRaw, 10) : NaN;
  const take = Number.isFinite(parsedLimit)
    ? Math.min(100, Math.max(1, parsedLimit))
    : 50;

  /** Chaque mot doit apparaître au moins une fois dans nom, prénom, CIN ou téléphone (AND entre mots, OR sur les champs). */
  const words = searchTerm.split(/\s+/).filter((w) => w.length > 0);

  const where =
    words.length > 0
      ? {
          AND: words.map((word) => ({
            OR: [
              { nom: { contains: word, mode: 'insensitive' as const } },
              { prenom: { contains: word, mode: 'insensitive' as const } },
              { cin: { contains: word, mode: 'insensitive' as const } },
              { tel: { contains: word, mode: 'insensitive' as const } },
            ],
          })),
        }
      : undefined;

  try {
    const patients = await prisma.patient.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return NextResponse.json(patients);
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

    let assuranceType: AssuranceType = 'AUCUNE';
    if (assuranceRaw !== undefined && assuranceRaw !== null && assuranceRaw !== '') {
      const parsed = parseAssuranceType(assuranceRaw);
      if (parsed === undefined) {
        return NextResponse.json({ error: 'Type d’assurance invalide' }, { status: 400 });
      }
      assuranceType = parsed;
    }

    const matriculeAssurance =
      matriculeAssuranceRaw !== undefined && matriculeAssuranceRaw !== null && String(matriculeAssuranceRaw).trim() !== ''
        ? String(matriculeAssuranceRaw).trim().slice(0, 200)
        : undefined;

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
        matriculeAssurance,
      },
    });

    return NextResponse.json(newPatient, { status: 201 });
  } catch (error) {
    console.error('[POST /api/patients]', error);
    return NextResponse.json({ error: 'Erreur lors de la création du patient' }, { status: 500 });
  }
}
