import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJwt } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import type { AssuranceType, Prisma } from '@/generated/prisma/client';
import { parseAssuranceType, parseOptionalFloat, parseSexe } from '@/lib/patient-fields';

// helper pour auth
async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return await verifyJwt(token);
}

/** Normalise l’identifiant de route : trim, décodage URI, UUID en minuscules (PG/Prisma) ; CUID laissé tel quel. */
function normalizePatientRouteId(raw: string): string {
  const trimmed = decodeURIComponent(String(raw).trim());
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

const PATIENT_GET_INCLUDE = {
  appointments: {
    orderBy: { date_heure: 'desc' as const },
    take: 40,
    include: {
      consultation: {
        select: {
          notes_medecin: true,
          diagnostic: true,
        },
      },
    },
  },
  invoices: {
    orderBy: { createdAt: 'desc' as const },
    take: 80,
    select: {
      id: true,
      montant: true,
      statut: true,
      modePaiement: true,
      createdAt: true,
      datePaiement: true,
      sharingToken: true,
      appointmentId: true,
      appointment: {
        select: {
          id: true,
          date_heure: true,
          motif: true,
        },
      },
    },
  },
  patientDocuments: {
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.PatientInclude;

// GET: Récupérer un patient spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawFromParams } = await params;
  const id = normalizePatientRouteId(rawFromParams);
  console.log('ID recherché:', id);

  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    let patient = await prisma.patient.findUnique({
      where: { id },
      include: PATIENT_GET_INCLUDE,
    });

    const rawTrim = rawFromParams.trim();
    if (!patient && rawTrim !== id) {
      patient = await prisma.patient.findUnique({
        where: { id: rawTrim },
        include: PATIENT_GET_INCLUDE,
      });
    }

    if (!patient) {
      return NextResponse.json({}, { status: 200 });
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error('[GET /api/patients/:id]', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du patient' }, { status: 500 });
  }
}

// PUT: Mettre à jour un patient
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const { id: rawId } = await params;
    const id = normalizePatientRouteId(rawId);
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

    const sexe = parseSexe(sexeRaw);
    if (sexeRaw !== undefined && sexeRaw !== null && sexeRaw !== '' && sexe === undefined) {
      return NextResponse.json(
        { error: 'Sexe invalide (attendu : MASCULIN ou FEMININ)' },
        { status: 400 }
      );
    }

    const groupe = groupeSanguin ?? groupe_sanguin;
    const taille = parseOptionalFloat(tailleRaw);
    const poids = parseOptionalFloat(poidsRaw);
    if (taille !== undefined && (taille < 30 || taille > 250)) {
      return NextResponse.json({ error: 'Taille hors plage (30–250 cm)' }, { status: 400 });
    }
    if (poids !== undefined && (poids < 1 || poids > 500)) {
      return NextResponse.json({ error: 'Poids hors plage (1–500 kg)' }, { status: 400 });
    }

    let assurancePatch: { assuranceType?: AssuranceType; matriculeAssurance?: string | null } = {};
    if (assuranceRaw !== undefined) {
      if (assuranceRaw === null || assuranceRaw === '') {
        assurancePatch = { assuranceType: 'AUCUNE', matriculeAssurance: null };
      } else {
        const parsed = parseAssuranceType(assuranceRaw);
        if (parsed === undefined) {
          return NextResponse.json({ error: 'Type d’assurance invalide' }, { status: 400 });
        }
        assurancePatch = { assuranceType: parsed };
      }
    }
    if (matriculeAssuranceRaw !== undefined) {
      const m =
        matriculeAssuranceRaw === null || String(matriculeAssuranceRaw).trim() === ''
          ? null
          : String(matriculeAssuranceRaw).trim().slice(0, 200);
      assurancePatch = { ...assurancePatch, matriculeAssurance: m };
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom: String(nom).trim() }),
        ...(prenom !== undefined && { prenom: String(prenom).trim() }),
        ...(date_naissance && { date_naissance: new Date(date_naissance) }),
        ...(tel !== undefined && {
          tel:
            tel === null || tel === ''
              ? null
              : String(tel).trim() === ''
                ? null
                : String(tel).trim(),
        }),
        ...(email !== undefined && { email: email === '' ? null : String(email) }),
        ...(adresse !== undefined && { adresse: adresse === '' ? null : String(adresse) }),
        ...(allergies !== undefined && { allergies: allergies === '' ? null : String(allergies) }),
        ...(antecedents !== undefined && { antecedents: antecedents === '' ? null : String(antecedents) }),
        ...(cin !== undefined && { cin: cin === '' ? null : String(cin).trim() }),
        ...(sexeRaw !== undefined && { sexe: sexe ?? null }),
        ...(groupe !== undefined && {
          groupeSanguin:
            groupe === '' || groupe === 'INCONNU' ? null : String(groupe),
        }),
        ...(tailleRaw !== undefined && { taille: taille ?? null }),
        ...(poidsRaw !== undefined && { poids: poids ?? null }),
        ...assurancePatch,
      },
    });

    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('[PUT /api/patients/:id]', error);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du patient' }, { status: 500 });
  }
}

/** PATCH — même logique que PUT (mise à jour partielle des champs fournis). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context);
}

// DELETE: Supprimer un patient
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  
  // Exigence de rôle (seul l'admin ou le medecin peuvent supprimer)
  const role = (user as any).role;
  if (role !== 'ADMIN' && role !== 'DOCTOR') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
  }

  try {
    const { id: rawId } = await params;
    const id = normalizePatientRouteId(rawId);

    await prisma.$transaction(async (tx) => {
      await tx.invoice.deleteMany({ where: { patientId: id } });
      const apps = await tx.appointment.findMany({ where: { patient_id: id } });
      for (const a of apps) {
        await tx.consultationRecord.deleteMany({ where: { appointment_id: a.id } });
        await tx.document.deleteMany({ where: { appointment_id: a.id } });
        await tx.appointment.delete({ where: { id: a.id } });
      }
      await tx.patient.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Patient supprimé avec succès' });
  } catch (error) {
    console.error('[DELETE /api/patients/:id]', error);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
