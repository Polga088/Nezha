import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureGlobalSettings } from '@/lib/global-settings';
import { buildPrescriptionVerificationPublicUrl } from '@/lib/app-url';
import { cinMatches } from '@/lib/cin-verify';
import { generateInvoicePdfBuffer } from '@/lib/generate-invoice-pdf';
import { generatePrescriptionPdfBuffer } from '@/lib/generate-prescription-pdf';
import { buildPrescriptionPdfBranding } from '@/lib/prescription-pdf-branding';
import { parseMedicamentsJson } from '@/lib/prescription-types';

function resolveAssetUrl(request: NextRequest, url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const u = new URL(request.url);
  const origin = `${u.protocol}//${u.host}`;
  return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
}

/** GET — vérifie que le lien existe (sans données patient). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
  }

  const p = await prisma.prescription.findFirst({
    where: { sharingToken: token },
    select: { id: true },
  });
  const i = await prisma.invoice.findFirst({
    where: { sharingToken: token },
    select: { id: true },
  });

  if (!p && !i) {
    return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true as const,
    type: p ? ('prescription' as const) : ('invoice' as const),
  });
}

/** POST — body `{ cin, verifyOnly? }` : si `verifyOnly: true`, réponse JSON `{ ok }` ; sinon PDF si CIN correct. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
  }

  let body: { cin?: string; verifyOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON attendu' }, { status: 400 });
  }
  const cinRaw = typeof body.cin === 'string' ? body.cin : '';
  const verifyOnly = body.verifyOnly === true;

  const prescription = await prisma.prescription.findFirst({
    where: { sharingToken: token },
    include: { patient: true, doctor: { select: { nom: true, specialite: true } } },
  });

  if (prescription) {
    if (!prescription.patient.cin) {
      return NextResponse.json(
        { error: 'Vérification impossible : CIN non renseigné au cabinet. Contactez votre médecin.' },
        { status: 403 }
      );
    }
    if (!cinMatches(cinRaw, prescription.patient.cin)) {
      return NextResponse.json({ error: 'CIN incorrect' }, { status: 403 });
    }

    if (verifyOnly) {
      return NextResponse.json({
        ok: true as const,
        type: 'prescription' as const,
        document: {
          patientPrenom: prescription.patient.prenom,
          patientNom: prescription.patient.nom,
          date: prescription.date.toISOString(),
        },
      });
    }

    const meds = parseMedicamentsJson(prescription.medicaments);
    if (!meds) {
      return NextResponse.json({ error: 'Données ordonnance invalides' }, { status: 500 });
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

    const filename = `ordonnance-${prescription.patient.nom}-${prescription.id.slice(0, 8)}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { sharingToken: token },
    include: {
      patient: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  }

  const patient = invoice.patient;
  if (!patient.cin) {
    return NextResponse.json(
      { error: 'Vérification impossible : CIN non renseigné au cabinet. Contactez votre médecin.' },
      { status: 403 }
    );
  }
  if (!cinMatches(cinRaw, patient.cin)) {
    return NextResponse.json({ error: 'CIN incorrect' }, { status: 403 });
  }

  const globalRow = await ensureGlobalSettings();
  const cabinetCurrency = globalRow.currency;

  if (verifyOnly) {
    return NextResponse.json({
      ok: true as const,
      type: 'invoice' as const,
      document: {
        patientPrenom: patient.prenom,
        patientNom: patient.nom,
        date: invoice.createdAt.toISOString(),
        montant: invoice.montant,
        currency: cabinetCurrency,
      },
    });
  }

  const buffer = generateInvoicePdfBuffer({
    numeroFacture: `FAC-${invoice.id.slice(0, 8).toUpperCase()}`,
    dateFacture: invoice.createdAt,
    patientPrenom: patient.prenom,
    patientNom: patient.nom,
    montant: invoice.montant,
    methode: invoice.modePaiement,
    statut: invoice.statut,
    datePaiement: invoice.datePaiement,
    currencyCode: cabinetCurrency,
  });

  const filename = `facture-${patient.nom}-${invoice.id.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}"`,
      'Cache-Control': 'no-store',
    },
  });
}
