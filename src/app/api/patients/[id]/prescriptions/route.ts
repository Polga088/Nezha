import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeMedicamentLine } from '@/lib/prescription-normalize';
import { resolvePrescribingDoctorId } from '@/lib/prescription-doctor';
import { requireStaff } from '@/lib/requireStaff';
import { medicamentsSchema, medicamentsPayloadSchema } from '@/lib/prescription-types';

/** GET /api/patients/[id]/prescriptions — historique */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const { id: patientId } = await context.params;
  if (!patientId) {
    return NextResponse.json({ error: 'ID patient manquant' }, { status: 400 });
  }

  const exists = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
  }

  const rows = await prisma.prescription.findMany({
    where: { patientId },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      date: true,
      medicaments: true,
      conseils: true,
      diagnosticAssocie: true,
      sharingToken: true,
      createdAt: true,
      updatedAt: true,
      doctor: {
        select: { id: true, nom: true, specialite: true },
      },
    },
  });

  return NextResponse.json(rows);
}

/** POST /api/patients/[id]/prescriptions — enregistrer une ordonnance */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const { id: patientId } = await context.params;
  if (!patientId) {
    return NextResponse.json({ error: 'ID patient manquant' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const rawParsed = medicamentsPayloadSchema.safeParse(body.medicaments);
    if (!rawParsed.success) {
      return NextResponse.json(
        { error: 'medicaments : tableau non valide (au moins un médicament avec un nom)' },
        { status: 400 }
      );
    }

    const normalized = rawParsed.data.map((line) => normalizeMedicamentLine(line));
    const strict = medicamentsSchema.safeParse(normalized);
    if (!strict.success) {
      return NextResponse.json({ error: 'Données médicaments invalides après normalisation' }, { status: 400 });
    }

    const conseils =
      typeof body.conseils === 'string' ? body.conseils.trim() || null : null;
    const diagnosticAssocie =
      typeof body.diagnosticAssocie === 'string'
        ? body.diagnosticAssocie.trim() || null
        : null;

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      return NextResponse.json({ error: 'Patient introuvable' }, { status: 404 });
    }

    const doctorId = await resolvePrescribingDoctorId(auth.staff, body.doctorId);
    if (!doctorId) {
      return NextResponse.json(
        { error: 'Aucun médecin actif trouvé pour rattacher l’ordonnance' },
        { status: 400 }
      );
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        doctorId,
        medicaments: strict.data,
        diagnosticAssocie,
        conseils,
      },
    });

    return NextResponse.json(prescription);
  } catch (e) {
    console.error('[POST /api/patients/:id/prescriptions]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
