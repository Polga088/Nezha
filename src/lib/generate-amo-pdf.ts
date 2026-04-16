import { jsPDF } from 'jspdf';

import { drawMedicalDocumentHeader } from '@/lib/generate-prescription-pdf';
import type { PrescriptionPdfLayoutBranding } from '@/lib/prescription-pdf-branding';

const MARGIN_MM = 18;

const drawFormFrame = (doc: jsPDF, x: number, y: number, w: number, h: number) => {
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);
  doc.rect(x, y, w, h, 'S');
};

const drawCheckbox = (doc: jsPDF, x: number, y: number, label: string) => {
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.25);
  doc.rect(x, y, 3.5, 3.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(label, x + 5.5, y + 2.8);
};

export type AmoPdfInput = {
  patientPrenom: string;
  patientNom: string;
  patientDateNaissance: Date;
  patientCin: string | null;
  matriculeAssurance: string | null;
  assuranceTypeLabel: string;
  dateActe: Date;
  branding: PrescriptionPdfLayoutBranding;
  diagnosticAssocie: string | null;
};

/**
 * Feuille de soins / support de déclaration AMO — mise en page type formulaire (cases, cadres).
 * Met en avant INPE (cabinet) et matricule d’assurance (patient) pour limiter les rejets caisse.
 */
export async function generateAmoPdfBuffer(input: AmoPdfInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = MARGIN_MM;
  const innerW = pageW - 2 * margin;

  await drawMedicalDocumentHeader(doc, input.branding);

  let y = 48;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('FEUILLE DE SOINS', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Document d’appui pour déclaration auprès de l’organisme d’assurance maladie — à compléter, cocher et conserver.',
    margin,
    y
  );
  y += 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Identification de l’assuré', margin, y);
  y += 6;

  const box1H = 40;
  drawFormFrame(doc, margin, y, innerW, box1H);
  let iy = y + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Nom : ${input.patientNom.toUpperCase()}`, margin + 3, iy);
  iy += 7;
  doc.text(`Prénom : ${input.patientPrenom}`, margin + 3, iy);
  iy += 7;
  doc.text(`Né(e) le : ${input.patientDateNaissance.toLocaleDateString('fr-FR')}`, margin + 3, iy);
  iy += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('N° de matricule d’assurance (à reporter tel que sur la carte) :', margin + 3, iy);
  doc.setFont('helvetica', 'normal');
  const matStr = input.matriculeAssurance?.trim() || '…………………………………………………………';
  doc.text(matStr, margin + 78, iy);
  iy += 7;
  doc.text(
    `CIN : ${input.patientCin?.trim() || '…………………………………………………………'}`,
    margin + 3,
    iy
  );
  iy += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Régime / organisme déclaré : ', margin + 3, iy);
  doc.setFont('helvetica', 'normal');
  doc.text(input.assuranceTypeLabel, margin + 48, iy);
  y += box1H + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('2. Identification du praticien / structure de soins', margin, y);
  y += 6;

  const box2H = 30;
  drawFormFrame(doc, margin, y, innerW, box2H);
  iy = y + 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Cabinet / structure : ${input.branding.cabinetName}`, margin + 3, iy);
  iy += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(
    `N° INPE (inscription professionnelle) : ${input.branding.inpe?.trim() || '……………………………………'}`,
    margin + 3,
    iy
  );
  doc.setTextColor(15, 23, 42);
  iy += 7;
  doc.setFont('helvetica', 'normal');
  const addr = input.branding.fullAddress.trim() || '—';
  const addrLines = doc.splitTextToSize(addr, innerW - 6);
  doc.text(addrLines, margin + 3, iy);
  iy += addrLines.length * 4.5 + 1;
  doc.text(`Tél. : ${input.branding.phone.trim() || '—'}`, margin + 3, iy);
  y += box2H + 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. Nature des soins (cocher les cases concernées)', margin, y);
  y += 7;

  const box3H = 30;
  drawFormFrame(doc, margin, y, innerW, box3H);
  let cy = y + 6;
  const cx = margin + 4;
  drawCheckbox(doc, cx, cy, 'Consultation médicale / visite');
  cy += 7;
  drawCheckbox(doc, cx, cy, 'Actes de biologie médicale');
  cy += 7;
  drawCheckbox(doc, cx, cy, 'Imagerie médicale / explorations');
  cy += 7;
  drawCheckbox(doc, cx, cy, 'Pharmacie / dispositifs prescrits');
  y += box3H + 6;

  if (input.diagnosticAssocie?.trim()) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Observations cliniques / diagnostic associé (référence dossier)', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const dx = doc.splitTextToSize(input.diagnosticAssocie.trim(), innerW);
    doc.text(dx, margin, y);
    y += dx.length * 4 + 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Date de l’acte / de la prescription : ${input.dateActe.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })}`,
    margin,
    y
  );
  y += 12;

  const sigH = 22;
  const half = innerW * 0.48;
  const gap = innerW * 0.04;
  drawFormFrame(doc, margin, y, half, sigH);
  drawFormFrame(doc, margin + half + gap, y, half, sigH);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Signature de l’assuré (ou du représentant légal)', margin + 2, y + 7);
  doc.text(`${input.branding.doctorLine}`, margin + half + gap + 2, y + 7);
  doc.setFontSize(7);
  doc.text('Signature et cachet du praticien', margin + half + gap + 2, y + 12);

  y += sigH + 8;

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  const legal = doc.splitTextToSize(
    'Mentions à vérifier avant envoi : le N° INPE du praticien et le matricule d’assurance de l’assuré doivent être complets, exacts et lisibles pour éviter un rejet par les caisses. Ce document est un support de déclaration ; la prise en charge dépend du règlement de l’organisme concerné.',
    innerW
  );
  doc.text(legal, margin, y);

  return Buffer.from(doc.output('arraybuffer'));
}
