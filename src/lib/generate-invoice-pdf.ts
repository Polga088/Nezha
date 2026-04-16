import { jsPDF } from 'jspdf';

import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';

type PM = 'CASH' | 'CARD' | 'CHECK';
type PS = 'PENDING' | 'PAID' | 'CANCELLED';

const METHODE_LABEL: Record<PM, string> = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  CHECK: 'Chèque',
};

const STATUT_LABEL: Record<PS, string> = {
  PENDING: 'En attente',
  PAID: 'Acquittée',
  CANCELLED: 'Annulée',
};

export type InvoicePdfInput = {
  numeroFacture: string;
  dateFacture: Date;
  patientPrenom: string;
  patientNom: string;
  montant: number;
  methode: PM;
  statut: PS;
  datePaiement: Date | null;
  /** Code ISO devise cabinet (ex. MAD, EUR). */
  currencyCode?: string;
};

export function generateInvoicePdfBuffer(input: InvoicePdfInput): Buffer {
  const amountSuffix = currencyAmountSuffix(
    (input.currencyCode || 'EUR').trim().toUpperCase() || 'EUR'
  );
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 18;
  let y = margin;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Nezha Medical', margin, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Avenue de la Santé — 75000 Paris — Tél. 01 23 45 67 89', margin, 24);

  y = 38;
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('FACTURE', pageW - margin, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`N° ${input.numeroFacture}`, pageW - margin, y, { align: 'right' });
  y += 5;
  doc.text(
    `Date : ${input.dateFacture.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })}`,
    pageW - margin,
    y,
    { align: 'right' }
  );

  y += 16;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Facturé à', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text(`${input.patientPrenom} ${input.patientNom.toUpperCase()}`, margin, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Paiement : ${METHODE_LABEL[input.methode]}`, margin, y);
  y += 5;
  doc.text(`Statut : ${STATUT_LABEL[input.statut]}`, margin, y);
  if (input.datePaiement) {
    y += 5;
    doc.text(`Date de paiement : ${input.datePaiement.toLocaleDateString('fr-FR')}`, margin, y);
  }

  y += 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Désignation', margin, y);
  doc.text('Montant', pageW - margin, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Prestation médicale (${input.dateFacture.toLocaleDateString('fr-FR')})`, margin, y);
  doc.text(`${input.montant.toFixed(2)} ${amountSuffix}`, pageW - margin, y, { align: 'right' });

  y += 20;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOTAL TTC', margin, y);
  doc.text(`${input.montant.toFixed(2)} ${amountSuffix}`, pageW - margin, y, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TVA non applicable, art. 293 B du CGI.', pageW - margin, y, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}
