'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Plus,
  User,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  Download,
  Upload,
  ShieldCheck,
  FileDown,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CreatePatientModal } from '@/components/patients/CreatePatientModal';
import {
  EditPatientModal,
  type PatientForEdit,
} from '@/components/patients/EditPatientModal';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { ClinicalHero } from '@/components/ui/clinical-hero';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { hasDeclaredAssurance } from '@/lib/assurance-types';

type PatientRow = PatientForEdit;

type ImportReportRow = {
  line: number;
  nom: string | null;
  prenom: string | null;
  result: 'CREATED' | 'UPDATED' | 'SKIPPED' | 'REJECTED' | 'WARNING';
  field: string | null;
  value: string | null;
  message: string;
};

type ImportSummary = {
  analyzed: number;
  created: number;
  updated: number;
  ignored: number;
  rejected: number;
  warnings: number;
};

type ImportResponse = {
  message?: string;
  summary?: ImportSummary;
  reportRows?: ImportReportRow[];
  reportCsv?: string;
  error?: string;
  errors?: string[];
};

/** En-têtes attendues par POST /api/patients/import (ligne vide sous l’en-tête). */
const PATIENT_IMPORT_CSV_HEADERS =
  'nom,prenom,date_naissance,cin,sexe,tel,email,adresse,groupeSanguin,taille,poids,assuranceType,matriculeAssurance';

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editPatient, setEditPatient] = useState<PatientForEdit | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<'SKIP' | 'UPDATE' | 'CREATE_ONLY'>('SKIP');
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [reportPage, setReportPage] = useState(1);

  /** Valeur envoyée à l’API (`?q=`) après pause de saisie (debounce). */
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const trimmed = search.trim();
    const delayMs = trimmed === '' ? 0 : 400;
    const id = window.setTimeout(() => {
      setDebouncedQuery(trimmed);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [search]);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const url = debouncedQuery
        ? `/api/patients?q=${encodeURIComponent(debouncedQuery)}`
        : '/api/patients';
      const res = await fetch(url);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[Patients] GET failed', res.status, err);
        throw new Error('Query failed');
      }
      const data = await res.json();
      setPatients(Array.isArray(data) ? data : []);
    } catch (e) {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    void fetchPatients();
  }, [fetchPatients]);

  const openEdit = (p: PatientRow) => {
    setEditPatient(p);
    setEditOpen(true);
  };

  const handleDelete = async (p: PatientRow) => {
    if (!confirm(`Supprimer définitivement le dossier de ${p.prenom} ${p.nom} ?`)) return;
    try {
      const res = await fetch(`/api/patients/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[Patients] DELETE', res.status, err);
        if (res.status === 403) {
          toast.error('Permissions insuffisantes (Admin ou Médecin).');
        } else {
          toast.error(err?.error ?? 'Suppression impossible');
        }
        return;
      }
      toast.success('Patient supprimé');
      router.refresh();
      fetchPatients();
    } catch (err) {
      console.error('[Patients] handleDelete', err);
      toast.error('Erreur serveur.');
    }
  };

  const handleDownloadImportTemplate = () => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + PATIENT_IMPORT_CSV_HEADERS + '\n'], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modele-import-patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Modèle CSV téléchargé');
  };

  const handleExportCsv = async () => {
    try {
      const res = await fetch('/api/patients/export');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === 'string' ? err.error : 'Export impossible');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition');
      const m = cd?.match(/filename="([^"]+)"/);
      a.download = m?.[1] ?? `patients-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch {
      toast.error('Erreur lors de l’export');
    }
  };

  const handleImportCsv: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mode', importMode);
      const res = await fetch('/api/patients/import', { method: 'POST', body: fd });
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide');
      }
      const data = (await res.json()) as ImportResponse;
      if (!res.ok) {
        const msg = typeof data.error === 'string' ? data.error : 'Import impossible';
        toast.error(msg);
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          toast.message('Détail', {
            description: data.errors.join('\n'),
            duration: 22_000,
          });
        }
        return;
      }
      setImportResult(data);
      setReportPage(1);
      toast.success(data.message ?? 'Import terminé');
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        toast.message('Lignes non importées', {
          description: data.errors.join('\n'),
          duration: 25_000,
        });
      }
      fetchPatients();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import impossible');
    } finally {
      setImporting(false);
    }
  };

  const reportRows = importResult?.reportRows ?? [];
  const reportSummary = importResult?.summary ?? null;
  const totalPages = Math.max(1, Math.ceil(reportRows.length / 20));
  const currentPage = Math.min(reportPage, totalPages);
  const pageRows = useMemo(
    () => reportRows.slice((currentPage - 1) * 20, currentPage * 20),
    [currentPage, reportRows]
  );

  const handleDownloadReportCsv = () => {
    if (!importResult?.reportCsv) return;
    const blob = new Blob([importResult.reportCsv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-import-patients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Rapport CSV téléchargé');
  };

  return (
    <div className="animate-fade-in space-y-6">
      <ClinicalHero
        icon={User}
        eyebrow="Patients"
        title="Dossiers médicaux"
        description="Recherchez, créez et gérez les dossiers patients de votre cabinet."
        actions={
          <Button
            type="button"
            size="lg"
            className="gap-2 rounded-xl"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} /> Nouveau patient
          </Button>
        }
      />

      <DataTableShell
        title="Liste des patients"
        description="Recherchez, importez ou exportez vos dossiers."
        icon={User}
        toolbar={
          <>
            <div className="relative w-full max-w-sm flex items-center">
              <Search className="absolute left-3.5 text-slate-400" size={17} />
              <Input
                placeholder="Nom, prénom, téléphone, CIN…"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Recherche patient"
                autoComplete="off"
              />
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={handleImportCsv}
            />
            <select
              aria-label="Mode d’import"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              value={importMode}
              onChange={(event) => setImportMode(event.target.value as 'SKIP' | 'UPDATE' | 'CREATE_ONLY')}
            >
              <option value="SKIP">SKIP</option>
              <option value="UPDATE">UPDATE</option>
              <option value="CREATE_ONLY">CREATE_ONLY</option>
            </select>
            <Button type="button" variant="outline" className="gap-2" onClick={handleExportCsv}>
              <Download size={16} aria-hidden />
              Export
            </Button>
            <Button type="button" variant="outline" className="gap-2" onClick={handleDownloadImportTemplate}>
              <FileDown size={16} aria-hidden />
              Modèle CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={16} aria-hidden />
              {importing ? 'Import…' : 'Importer'}
            </Button>
          </>
        }
      >
        {reportSummary ? (
          <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="grid gap-3 md:grid-cols-6">
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Analysés</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">{reportSummary.analyzed}</div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Créés</div>
                <div className="mt-1 text-2xl font-semibold text-emerald-600">{reportSummary.created}</div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Mis à jour</div>
                <div className="mt-1 text-2xl font-semibold text-blue-600">{reportSummary.updated}</div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Ignorés</div>
                <div className="mt-1 text-2xl font-semibold text-amber-600">{reportSummary.ignored}</div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Rejetés</div>
                <div className="mt-1 text-2xl font-semibold text-red-600">{reportSummary.rejected}</div>
              </div>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <div className="text-xs uppercase tracking-wide text-slate-500">Avertissements</div>
                <div className="mt-1 text-2xl font-semibold text-violet-600">{reportSummary.warnings}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-sm font-medium text-slate-600">
                {importResult?.message ?? 'Import terminé'}
              </div>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={handleDownloadReportCsv}
              >
                <FileDown size={16} aria-hidden />
                Export rapport CSV
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">Rapport d’import</div>
                <div className="text-sm text-slate-500">
                  {reportRows.length} ligne{reportRows.length > 1 ? 's' : ''}
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Ligne</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Prénom</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Champ</TableHead>
                      <TableHead>Valeur</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-20 text-center text-slate-400">
                          Aucun rapport à afficher
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageRows.map((row) => (
                        <TableRow key={`${row.line}-${row.field ?? 'row'}-${row.message}`}>
                          <TableCell>{row.line}</TableCell>
                          <TableCell>{row.nom ?? '—'}</TableCell>
                          <TableCell>{row.prenom ?? '—'}</TableCell>
                          <TableCell>{row.result}</TableCell>
                          <TableCell>{row.field ?? '—'}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{row.value ?? '—'}</TableCell>
                          <TableCell className="max-w-[420px]">{row.message}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <div className="text-sm text-slate-500">
                  Page {currentPage} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReportPage((value) => Math.max(1, value - 1))}
                    disabled={currentPage <= 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setReportPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Patient</TableHead>
              <TableHead className="hidden sm:table-cell">Téléphone</TableHead>
              <TableHead className="hidden md:table-cell">Date de naissance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-slate-400">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={User}
                    title="Aucun patient enregistré"
                    description='Créez votre premier dossier médical en cliquant sur "Nouveau patient".'
                    action={
                      <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                        <Plus size={16} /> Nouveau patient
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p) => (
                <TableRow key={p.id} className="cursor-pointer">
                  <TableCell
                    className="font-medium"
                    onClick={() => router.push(`/dashboard/patients/${p.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shrink-0 ring-1 ring-blue-100">
                        <AvatarFallback className="font-semibold text-xs border border-blue-100">
                          {p.prenom[0]}
                          {p.nom[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-slate-900 font-semibold">
                          {p.prenom} <span className="uppercase">{p.nom}</span>
                        </span>
                      </div>
                      {hasDeclaredAssurance(p.assuranceType) ? (
                        <span
                          className="shrink-0 text-emerald-600/85"
                          title="Couverture sociale déclarée"
                          aria-label="Couverture sociale déclarée"
                        >
                          <ShieldCheck className="h-4 w-4" strokeWidth={2} aria-hidden />
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-slate-600 hidden sm:table-cell"
                    onClick={() => router.push(`/dashboard/patients/${p.id}`)}
                  >
                    {p.tel}
                  </TableCell>
                  <TableCell
                    className="text-slate-600 hidden md:table-cell"
                    onClick={() => router.push(`/dashboard/patients/${p.id}`)}
                  >
                    {new Date(p.date_naissance).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                          type="button"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => router.push(`/dashboard/patients/${p.id}`)}
                        >
                          <FileText className="mr-2 h-4 w-4" /> Voir Dossier
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => openEdit(p)}>
                          <Edit className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:bg-red-50 focus:text-red-600"
                          onSelect={() => handleDelete(p)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>

      <CreatePatientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={() => {
          fetchPatients();
          router.refresh();
        }}
      />
      <EditPatientModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditPatient(null);
        }}
        patient={editPatient}
        onSuccess={() => {
          fetchPatients();
          router.refresh();
        }}
      />
    </div>
  );
}
