import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildPrescriptionVerificationPublicUrl } from '@/lib/app-url';
import { buildPrescriptionPdfBranding } from '@/lib/prescription-pdf-branding';
import { generatePrescriptionPdfBuffer } from '@/lib/generate-prescription-pdf';
import { parseMedicamentsJson } from '@/lib/prescription-types';
import { requireStaff } from '@/lib/requireStaff';

function resolveAssetUrl(request: NextRequest, url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const u = new URL(request.url);
  const origin = `${u.protocol}//${u.host}`;
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

/** GET /api/prescriptions/[id]/pdf — PDF ordonnance */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  try {
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: { select: { nom: true, specialite: true } },
      },
    });

    if (!prescription) {
      return NextResponse.json({ error: 'Ordonnance introuvable' }, { status: 404 });
    }

    const meds = parseMedicamentsJson(prescription.medicaments);
    if (!meds) {
      return NextResponse.json({ error: 'Données médicaments invalides' }, { status: 500 });
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { id: 'default' },
      select: {
        signatureUrl: true,
        cabinetName: true,
        doctorDisplayName: true,
        logoUrl: true,
        cabinetPhone: true,
        cabinetAddress: true,
        cabinetCityLine: true,
        doctorInpe: true,
        doctorSpecialty: true,
      },
    });

    const sigUrl = resolveAssetUrl(request, settings?.signatureUrl ?? null);
    const doctorName =
      prescription.doctor?.nom?.trim() || settings?.doctorDisplayName?.trim() || null;
    const doctorSpecialty =
      prescription.doctor?.specialite?.trim() || settings?.doctorSpecialty?.trim() || null;

    const brandingCore = buildPrescriptionPdfBranding({
      cabinetName: settings?.cabinetName ?? null,
      doctorDisplayName: doctorName,
      logoUrl: settings?.logoUrl ?? null,
      cabinetPhone: settings?.cabinetPhone ?? null,
      cabinetAddress: settings?.cabinetAddress ?? null,
      cabinetCityLine: settings?.cabinetCityLine ?? null,
      doctorInpe: settings?.doctorInpe ?? null,
      doctorSpecialty,
    });

    const buffer = await generatePrescriptionPdfBuffer({
      patientPrenom: prescription.patient.prenom,
      patientNom: prescription.patient.nom,
      patientDateNaissance: prescription.patient.date_naissance,
      dateOrdonnance: prescription.date,
      medicaments: meds,
      diagnosticAssocie: prescription.diagnosticAssocie,
      conseils: prescription.conseils,
      branding: {
        ...brandingCore,
        logoUrlResolved: resolveAssetUrl(request, settings?.logoUrl ?? null),
      },
      signatureUrl: sigUrl,
      verificationPublicUrl: buildPrescriptionVerificationPublicUrl(prescription.sharingToken),
    });

    const filename = `ordonnance-${prescription.patient.nom}-${id.slice(0, 8)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    console.error('[GET /api/prescriptions/:id/pdf]', e);
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
  }
}
