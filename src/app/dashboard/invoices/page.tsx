'use client';

import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import useSWR, { useSWRConfig } from 'swr';
import {
  CheckCircle,
  CreditCard,
  Download,
  FileText,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InvoiceModal } from '@/components/invoices/InvoiceModal';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/useSettings';
import { currencyAmountSuffix } from '@/lib/currency-amount-suffix';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const INVOICES_SWR_KEY = '/api/invoices';
const ME_KEY = '/api/auth/me';

type MeRole = { role?: string };

type InvoiceApiRow = {
  id: string;
  createdAt: string;
  montant: number;
  statut: 'PENDING' | 'PAID' | 'CANCELLED';
  patient: { id: string; nom: string; prenom: string };
  modePaiement?: string;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(typeof j?.error === 'string' ? j.error : 'Erreur de chargement');
  }
  return res.json() as Promise<InvoiceApiRow[]>;
};

const meFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) return {} as MeRole;
  return res.json() as Promise<MeRole>;
};

function invoiceNumero(id: string) {
  return `FAC-${id.slice(0, 8).toUpperCase()}`;
}

function patientLabel(inv: InvoiceApiRow) {
  const { prenom, nom } = inv.patient;
  return `${prenom} ${nom}`.trim();
}

export default function InvoicesPage() {
  const { mutate: globalMutate } = useSWRConfig();
  const { data: me } = useSWR<MeRole>(ME_KEY, meFetcher, { revalidateOnFocus: true });
  const roleUpper = me?.role ? String(me.role).toUpperCase() : '';
  /** Aligné sur DELETE /api/invoices/[id] : rôles « staff » + parité médecin / admin. */
  const canDeleteInvoice =
    roleUpper === 'ADMIN' || roleUpper === 'DOCTOR' || roleUpper === 'ASSISTANT';

  const { settings: cabinetSettings } = useSettings(true);
  const invoiceAmountSuffix = currencyAmountSuffix(
    cabinetSettings?.currency?.trim() || 'EUR'
  );

  const {
    data: invoiceRows,
    error: invoicesError,
    isLoading: invoicesLoading,
  } = useSWR<InvoiceApiRow[]>(INVOICES_SWR_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  const [patients, setPatients] = useState<
    { id: string; prenom: string; nom: string; cin: string | null }[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);
  const [pdfInvoice, setPdfInvoice] = useState<InvoiceApiRow | null>(null);

  const [pendingDelete, setPendingDelete] = useState<InvoiceApiRow | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/patients')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPatients(data);
      })
      .catch((err) => console.error('Error fetching patients:', err));
  }, []);

  const refreshAfterInvoiceChange = async () => {
    await globalMutate(INVOICES_SWR_KEY);
    await globalMutate(
      (key) => typeof key === 'string' && key.startsWith('/api/admin/analytics'),
      undefined,
      { revalidate: true }
    );
    await globalMutate('/api/admin/analytics', undefined, { revalidate: true });
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ statut: 'PAID' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j?.error === 'string' ? j.error : 'Mise à jour impossible');
        return;
      }
      toast.success('Facture marquée comme payée');
      await refreshAfterInvoiceChange();
    } catch {
      toast.error('Erreur réseau');
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${pendingDelete.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.error === 'string' ? j.error : 'Suppression impossible');
        return;
      }
      toast.success('Facture supprimée');
      setPendingDelete(null);
      await refreshAfterInvoiceChange();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleGeneratePdf = async (inv: InvoiceApiRow) => {
    setPdfInvoice(inv);
    setTimeout(async () => {
      if (!pdfRef.current) return;
      const element = pdfRef.current;
      element.style.left = '0';
      element.style.top = '0';
      element.style.zIndex = '-1';

      try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        const safeName = patientLabel(inv).replace(/\s+/g, '_');
        pdf.save(`${invoiceNumero(inv.id)}_${safeName}.pdf`);
        toast.success('PDF généré avec succès');
      } catch (e) {
        console.error('Erreur PDF:', e);
        toast.error('Erreur lors de la génération du PDF');
      } finally {
        element.style.left = '-9999px';
        element.style.top = '-9999px';
        setPdfInvoice(null);
      }
    }, 100);
  };

  const renderStatusBadge = (status: InvoiceApiRow['statut']) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge className="border-none bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
            <CheckCircle className="mr-1 h-3 w-3" /> Payé
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="border-none bg-orange-100 text-orange-700 hover:bg-orange-200">
            En attente
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="border-none bg-red-100 text-red-700 hover:bg-red-200">
            <XCircle className="mr-1 h-3 w-3" /> Annulé
          </Badge>
        );
    }
  };

  const list = invoiceRows ?? [];
  const filteredInvoices = list.filter(
    (i) =>
      invoiceNumero(i.id).toLowerCase().includes(searchQuery.toLowerCase()) ||
      patientLabel(i).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pdfDateLabel = pdfInvoice
    ? format(new Date(pdfInvoice.createdAt), 'dd/MM/yyyy', { locale: fr })
    : '';

  return (
    <div className="animate-fade-in mx-auto max-w-7xl space-y-6 pb-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-900">
          <CreditCard className="h-8 w-8 text-blue-600" /> Facturation & Paiements
        </h1>
      </div>

      {invoicesError && (
        <Card className="rounded-2xl border-0 bg-red-50/50 p-4 text-sm text-red-800 shadow-sm ring-1 ring-red-100/80">
          {invoicesError.message}
        </Card>
      )}

      <Card className="overflow-hidden rounded-2xl border-0 bg-white shadow-sm">
        <div className="border-b border-slate-100/80 bg-white px-6 py-6">
          <h2 className="text-lg font-bold text-slate-800">Factures émises</h2>
          <p className="text-sm text-slate-500">
            Gérez la facturation et suivez les règlements de vos patients.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-100/80 bg-white px-6 py-5 sm:flex-row">
          <div className="relative flex w-full max-w-sm items-center">
            <Search className="absolute left-3 text-slate-400" size={18} />
            <Input
              placeholder="Rechercher une facture, un patient..."
              className="pl-10 focus-visible:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <InvoiceModal open={isModalOpen} onOpenChange={setIsModalOpen} patients={patients} />
        </div>

        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-slate-500">
                N° Facture
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Date
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Patient
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Montant
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Statut
              </TableHead>
              <TableHead className="text-right align-middle text-xs font-bold uppercase tracking-wider text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoicesLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex justify-center py-12 text-sm text-slate-500">Chargement…</div>
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                    <FileText className="mb-3 h-12 w-12 text-slate-200" />
                    <p className="font-medium text-slate-700">Aucune facture trouvée.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="align-middle hover:bg-slate-50/40">
                  <TableCell className="font-semibold text-slate-800">{invoiceNumero(inv.id)}</TableCell>
                  <TableCell className="font-medium text-slate-600">
                    {format(new Date(inv.createdAt), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-slate-800">{patientLabel(inv)}</TableCell>
                  <TableCell className="font-bold text-slate-900">
                    {inv.montant.toFixed(2)} {invoiceAmountSuffix}
                  </TableCell>
                  <TableCell>{renderStatusBadge(inv.statut)}</TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="inline-flex items-center justify-end gap-2">
                      {inv.statut === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                          onClick={() => void handleMarkAsPaid(inv.id)}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" /> Payé
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-9 bg-blue-50 text-blue-600 hover:bg-blue-100"
                        onClick={() => void handleGeneratePdf(inv)}
                      >
                        <Download className="mr-1 h-3 w-3" /> PDF
                      </Button>
                      {canDeleteInvoice ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          title="Supprimer la facture"
                          className="h-9 w-9 shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label="Supprimer la facture"
                          onClick={() => setPendingDelete(inv)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubmitting}>Annuler</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteSubmitting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteSubmitting ? 'Suppression…' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        ref={pdfRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          minHeight: '1131px',
          padding: '50px',
          background: 'white',
          color: 'black',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        {pdfInvoice && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '3px solid #3b82f6',
                paddingBottom: '20px',
                marginBottom: '30px',
              }}
            >
              <div>
                <h1
                  style={{
                    color: '#1e40af',
                    fontSize: '28px',
                    fontWeight: 'bold',
                    margin: '0 0 10px 0',
                  }}
                >
                  Nezha Medical
                </h1>
                <p>123 Avenue de la Santé, 75000 Paris</p>
                <p>Tél : 01 23 45 67 89</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>FACTURE</h2>
                <p style={{ fontSize: '14px' }}>N° {invoiceNumero(pdfInvoice.id)}</p>
                <p style={{ fontSize: '14px' }}>Date : {pdfDateLabel}</p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                margin: '40px 0',
                fontSize: '16px',
              }}
            >
              <div>
                <p style={{ margin: '0 0 5px 0', color: '#666' }}>Facturé à :</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{patientLabel(pdfInvoice)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 5px 0', color: '#666' }}>Statut :</p>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 'bold',
                    color: pdfInvoice.statut === 'PAID' ? '#10b981' : '#f59e0b',
                  }}
                >
                  {pdfInvoice.statut === 'PAID' ? 'Acquittée' : 'En attente de paiement'}
                </p>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '50px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left', background: '#f8fafc' }}>
                  <th style={{ padding: '15px' }}>Désignation</th>
                  <th style={{ padding: '15px', textAlign: 'right' }}>Montant</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '20px 15px', fontSize: '16px' }}>
                    Prestation Médicale ({pdfDateLabel})
                  </td>
                  <td style={{ padding: '20px 15px', fontSize: '16px', textAlign: 'right' }}>
                    {pdfInvoice.montant.toFixed(2)} {invoiceAmountSuffix}
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                marginTop: '50px',
                borderTop: '2px solid #3b82f6',
                paddingTop: '20px',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <div style={{ width: '300px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                >
                  <span>TOTAL TTC</span>
                  <span>{pdfInvoice.montant.toFixed(2)} {invoiceAmountSuffix}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#666', textAlign: 'right', marginTop: '10px' }}>
                  TVA non applicable, art. 293 B du CGI.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
