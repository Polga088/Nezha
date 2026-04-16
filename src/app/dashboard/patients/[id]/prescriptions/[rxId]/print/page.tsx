import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { PrescriptionPrintShell } from '@/components/prescriptions/PrescriptionPrintShell';
import { verifyJwt } from '@/lib/auth';
import { getAppBaseUrl } from '@/lib/app-url';
import { buildPrescriptionPdfBranding } from '@/lib/prescription-pdf-branding';
import { prisma } from '@/lib/prisma';
import { parseMedicamentsJson } from '@/lib/prescription-types';

function resolvePublicAssetUrl(url: string | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = getAppBaseUrl().replace(/\/$/, '');
  return `${base}${u.startsWith('/') ? u : `/${u}`}`;
}

export default async function PrescriptionPrintPage({
  params,
}: {
  params: Promise<{ id: string; rxId: string }>;
}) {
  const { id: patientId, rxId } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  const payload = token ? await verifyJwt(token) : null;
  if (!payload) {
    redirect('/login');
  }
  const role = String(payload.role ?? '').toUpperCase();
  if (!['ADMIN', 'DOCTOR', 'ASSISTANT'].includes(role)) {
    redirect('/login');
  }

  const [prescription, settings] = await Promise.all([
    prisma.prescription.findFirst({
      where: { id: rxId, patientId },
      include: {
        patient: true,
        doctor: { select: { nom: true, specialite: true } },
      },
    }),
    prisma.globalSettings.findUnique({
      where: { id: 'default' },
    }),
  ]);

  if (!prescription) {
    notFound();
  }

  const meds = parseMedicamentsJson(prescription.medicaments);
  if (!meds) {
    notFound();
  }

  const doctorName =
    prescription.doctor?.nom?.trim() || settings?.doctorDisplayName?.trim() || null;
  const doctorSpecialty =
    prescription.doctor?.specialite?.trim() || settings?.doctorSpecialty?.trim() || null;

  const branding = buildPrescriptionPdfBranding({
    cabinetName: settings?.cabinetName ?? null,
    doctorDisplayName: doctorName,
    logoUrl: settings?.logoUrl ?? null,
    cabinetPhone: settings?.cabinetPhone ?? null,
    cabinetAddress: settings?.cabinetAddress ?? null,
    cabinetCityLine: settings?.cabinetCityLine ?? null,
    doctorInpe: settings?.doctorInpe ?? null,
    doctorSpecialty,
  });

  const addr = branding.fullAddress.trim();
  const base = getAppBaseUrl().replace(/\/$/, '');

  return (
    <PrescriptionPrintShell
      data={{
        patientPrenom: prescription.patient.prenom,
        patientNom: prescription.patient.nom,
        patientDateNaissance: prescription.patient.date_naissance.toISOString(),
        dateOrdonnance: prescription.date.toISOString(),
        medicaments: meds,
        diagnosticAssocie: prescription.diagnosticAssocie,
        conseils: prescription.conseils,
        cabinetName: branding.cabinetName,
        doctorLine: branding.doctorLine,
        doctorSpecialty: doctorSpecialty ?? null,
        cabinetPhone: branding.phone.trim(),
        cabinetAddress: addr,
        inpe: branding.inpe,
        logoUrl: resolvePublicAssetUrl(settings?.logoUrl ?? null),
        ustMarkSrc: `${base}/brand/ust-nezha-mark.svg`,
      }}
    />
  );
}
