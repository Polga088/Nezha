'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, User, MoreHorizontal, FileText, Edit, Trash2, Download, Upload, ShieldCheck, FileDown } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { hasDeclaredAssurance } from '@/lib/assurance-types';

type PatientRow = PatientForEdit;

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
      const res = await fetch('/api/patients/import', { method: 'POST', body: fd });
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide');
      }
      const data = await res.json();
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

  return (
    <div className="animate-fade-in space-y-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Dossiers Médicaux
        </h1>
      </div>

      <div className="bg-white border border-slate-200/60 shadow-premium rounded-xl flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80">
          <h2 className="text-lg font-bold text-slate-800">Liste des patients</h2>
          <p className="text-sm text-slate-500">
            Gérez l&apos;ensemble de votre base de dossiers médicaux.
          </p>
        </div>

        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-white">
          <div className="relative w-full max-w-md flex items-center">
            <Search className="absolute left-3 text-slate-400" size={18} />
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
            accept=".csv,text/csv"
            className="sr-only"
            aria-hidden
            tabIndex={-1}
            onChange={handleImportCsv}
          />
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              onClick={handleExportCsv}
            >
              <Download size={18} aria-hidden />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              onClick={handleDownloadImportTemplate}
            >
              <FileDown size={18} aria-hidden />
              Télécharger le modèle CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
            >
              <Upload size={18} aria-hidden />
              {importing ? 'Import…' : 'Importer CSV'}
            </Button>
            <Button
              type="button"
              className="gap-2 bg-gradient-to-b from-blue-500 to-blue-600 hover:brightness-95 hover:shadow-md text-white border border-blue-600/20 transition-all shadow-medical"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={18} /> Nouveau Patient
            </Button>
          </div>
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

        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[300px] text-xs font-bold uppercase tracking-wider text-slate-500">
                Patient
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                Téléphone
              </TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 hidden md:table-cell">
                Date de Naissance
              </TableHead>
              <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300">
                      <User size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-700 text-base">
                        Aucun patient enregistré
                      </p>
                      <p className="text-sm text-slate-400 mt-1">
                        Créez votre premier dossier médical en cliquant sur &quot;Nouveau Patient&quot;.
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/50 cursor-pointer">
                  <TableCell
                    className="font-medium"
                    onClick={() => router.push(`/dashboard/patients/${p.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9 bg-blue-50 text-blue-600 shrink-0">
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
      </div>
    </div>
  );
}
