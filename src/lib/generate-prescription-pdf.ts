import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

import type { PrescriptionPdfLayoutBranding } from '@/lib/prescription-pdf-branding';
import type { MedicamentLine } from '@/lib/prescription-types';

export type PrescriptionPdfInput = {
  patientPrenom: string;
  patientNom: string;
  patientDateNaissance: Date;
  dateOrdonnance: Date;
  medicaments: MedicamentLine[];
  diagnosticAssocie: string | null;
  conseils: string | null;
  branding: PrescriptionPdfLayoutBranding;
  signatureUrl: string | null;
  /**
   * URL complète encodée dans le QR (portail `/p/{sharingToken}`).
   * Le champ `sharingToken` en base sert de jeton d’accès public (parfois nommé access_token métier).
   */
  verificationPublicUrl: string | null;
};

/** Télécharge une image (URL absolue ou relative) et retourne base64 data URL pour jsPDF. */
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const b64 = buf.toString('base64');
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('png')) return `data:image/png;base64,${b64}`;
    if (ct.includes('jpeg') || ct.includes('jpg')) return `data:image/jpeg;base64,${b64}`;
    if (ct.includes('webp')) return `data:image/webp;base64,${b64}`;
    return `data:image/png;base64,${b64}`;
  } catch {
    return null;
  }
}

function drawDefaultLogoMark(
  doc: jsPDF,
  xMm: number,
  yMm: number,
  sizeMm: number,
  cabinetName: string
) {
  const initials = cabinetName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'NM';

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(xMm, yMm, sizeMm, sizeMm, 1.5, 1.5, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setTextColor(37, 99, 235);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(Math.min(11, sizeMm * 1.8));
  doc.text(initials, xMm + sizeMm / 2, yMm + sizeMm * 0.62, { align: 'center' });
}

/** Hauteur bandeau en-tête (logo + identité cabinet). */
const HEADER_H_MM = 40;
const MARGIN_MM = 18;
const LOGO_MM = 16;

export async function drawMedicalDocumentHeader(doc: jsPDF, branding: PrescriptionPdfLayoutBranding): Promise<void> {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = MARGIN_MM;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, HEADER_H_MM, 'F');

  const logoX = margin;
  const logoY = (HEADER_H_MM - LOGO_MM) / 2;

  let logoDataUrl: string | null = null;
  if (branding.logoUrlResolved) {
    logoDataUrl = await fetchImageAsDataUrl(branding.logoUrlResolved);
  }

  if (logoDataUrl) {
    try {
      const fmt =
        logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.addImage(logoDataUrl, fmt, logoX, logoY, LOGO_MM, LOGO_MM, undefined, 'FAST');
    } catch {
      drawDefaultLogoMark(doc, logoX, logoY, LOGO_MM, branding.cabinetName);
    }
  } else {
    drawDefaultLogoMark(doc, logoX, logoY, LOGO_MM, branding.cabinetName);
  }

  const textX = logoX + LOGO_MM + 4;
  const textMaxW = pageW - textX - margin;
  const metaBaselineY = HEADER_H_MM - 3;

  const telPart = branding.phone.trim() ? `Tél. ${branding.phone.trim()}` : '';
  const inpePart = branding.inpe ? `INPE : ${branding.inpe}` : '';
  const metaBits = [telPart, inpePart].filter(Boolean);
  const metaLine = metaBits.join('   ·   ');

  doc.setTextColor(255, 255, 255);
  let y = 10;
  const stopBefore = metaBaselineY - 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(branding.cabinetName, textMaxW).slice(0, 2);
  doc.text(titleLines, textX, y);
  y += titleLines.length * 5 + 1;

  if (branding.specialty && y < stopBefore) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const spLines = doc.splitTextToSize(branding.specialty, textMaxW).slice(0, 1);
    doc.text(spLines, textX, y);
    y += 4.5;
  }

  if (branding.fullAddress.trim() && y < stopBefore) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const addrLines = doc.splitTextToSize(branding.fullAddress.trim(), textMaxW).slice(0, 2);
    doc.text(addrLines, textX, y);
  }

  if (metaLine) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const metaLines = doc.splitTextToSize(metaLine, textMaxW);
    doc.text(metaLines, textX, metaBaselineY);
  }
}

/**
 * PDF ordonnance A4 — en-tête dynamique (réglages cabinet).
 */
export async function generatePrescriptionPdfBuffer(input: PrescriptionPdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = MARGIN_MM;

  await drawMedicalDocumentHeader(doc, input.branding);

  let y = HEADER_H_MM + 8;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ORDONNANCE', pageW - margin, y, { align: 'right' });
  y += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Date : ${input.dateOrdonnance.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    pageW - margin,
    y,
    { align: 'right' }
  );

  y += 14;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Patient', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`${input.patientPrenom} ${input.patientNom.toUpperCase()}`, margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Né(e) le : ${input.patientDateNaissance.toLocaleDateString('fr-FR')}`, margin, y);

  y += 12;
  if (input.diagnosticAssocie?.trim()) {
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Diagnostic associé', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const dxLines = doc.splitTextToSize(input.diagnosticAssocie.trim(), pageW - 2 * margin);
    doc.text(dxLines, margin, y);
    y += dxLines.length * 5 + 6;
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Prescription', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (let i = 0; i < input.medicaments.length; i++) {
    const m = input.medicaments[i];
    const dose = m.dosage?.trim();
    const block = `${i + 1}. ${m.nom}${dose ? ` — ${dose}` : ''}`;
    const lines = doc.splitTextToSize(block, pageW - 2 * margin);
    doc.text(lines, margin, y);
    y += lines.length * 5;
    const detail = `Posologie : ${m.posologie}${m.duree ? ` — Durée : ${m.duree}` : ''}`;
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    const dLines = doc.splitTextToSize(detail, pageW - 2 * margin - 4);
    doc.text(dLines, margin + 4, y);
    y += dLines.length * 4 + 4;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
  }

  if (input.conseils?.trim()) {
    if (y > 220) {
      doc.addPage();
      y = margin;
    }
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Conseils', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    const cLines = doc.splitTextToSize(input.conseils.trim(), pageW - 2 * margin);
    doc.text(cLines, margin, y);
    y += cLines.length * 5 + 4;
  }

  const sigY = Math.min(y + 20, 248);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(input.branding.doctorLine, pageW - margin, sigY, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature et cachet', pageW - margin, sigY + 5, { align: 'right' });

  let signatureBottomMm = sigY + 5;
  if (input.signatureUrl) {
    const dataUrl = await fetchImageAsDataUrl(input.signatureUrl);
    if (dataUrl) {
      try {
        const imgW = 42;
        const imgH = 18;
        const fmt = dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(dataUrl, fmt, pageW - margin - imgW, sigY + 8, imgW, imgH, undefined, 'FAST');
        signatureBottomMm = sigY + 8 + imgH
      } catch {
        /* image incompatible */
      }
    }
  }

  if (input.verificationPublicUrl?.trim()) {
    const pageH = doc.internal.pageSize.getHeight()
    const qrSizeMm = 22
    const gapBelowSig = 10
    let qrY = signatureBottomMm + gapBelowSig
    if (qrY + qrSizeMm + 14 > pageH - margin) {
      doc.addPage()
      qrY = margin
    }

    const lastPage = doc.getNumberOfPages()
    doc.setPage(lastPage)

    let qrPngDataUrl: string
    try {
      qrPngDataUrl = await QRCode.toDataURL(input.verificationPublicUrl.trim(), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
        type: 'image/png',
      })
    } catch {
      qrPngDataUrl = ''
    }

    if (qrPngDataUrl) {
      try {
        doc.setDrawColor(226, 232, 240)
        doc.setLineWidth(0.2)
        doc.line(margin, qrY - 4, pageW - margin, qrY - 4)

        doc.addImage(qrPngDataUrl, 'PNG', margin, qrY, qrSizeMm, qrSizeMm, undefined, 'FAST')

        const textX = margin + qrSizeMm + 5
        const textW = pageW - margin - textX
        doc.setTextColor(15, 23, 42)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8.5)
        doc.text('Authentification — QR Code', textX, qrY + 3)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(71, 85, 105)
        const explain = doc.splitTextToSize(
          'Scannez ce code pour ouvrir le portail sécurisé de vérification (identification du patient requise). Ne partagez pas ce lien hors du dossier de soins.',
          textW
        )
        doc.text(explain, textX, qrY + 8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(148, 163, 184)
        const urlLines = doc.splitTextToSize(input.verificationPublicUrl.trim(), textW)
        doc.text(urlLines, textX, qrY + 8 + explain.length * 3.6)
      } catch {
        /* QR ou rendu indisponible */
      }
    }
  }

  const out = doc.output('arraybuffer');
  return Buffer.from(out);
}
