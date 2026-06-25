'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { ClinicalHero } from '@/components/ui/clinical-hero';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { InsuranceTypeDto } from '@/lib/insurance-types';
import { normalizeInsuranceCode } from '@/lib/insurance-types';

type FormState = {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
};

const emptyForm: FormState = { name: '', code: '', description: '', isActive: true };

export default function AdminInsuranceTypesPage() {
  const [rows, setRows] = useState<InsuranceTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InsuranceTypeDto | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<InsuranceTypeDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/insurance-types', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('load failed');
      const data = (await res.json()) as InsuranceTypeDto[];
      setRows(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Chargement impossible');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: InsuranceTypeDto) => {
    setEditing(row);
    setForm({
      name: row.name,
      code: row.code,
      description: row.description ?? '',
      isActive: row.isActive,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: normalizeInsuranceCode(form.code),
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      const res = await fetch(
        editing ? `/api/admin/insurance-types/${editing.id}` : '/api/admin/insurance-types',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload),
        }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Enregistrement impossible');
        return;
      }
      toast.success(editing ? 'Type modifié' : 'Type créé');
      setDialogOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await fetch(`/api/admin/insurance-types/${pendingDelete.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Action impossible');
        return;
      }
      toast.success(typeof j.message === 'string' ? j.message : 'Opération réussie');
      setPendingDelete(null);
      await load();
    } catch {
      toast.error('Erreur réseau');
    }
  };

  return (
    <div className="animate-fade-in space-y-6 pb-10">
      <ClinicalHero
        icon={Shield}
        eyebrow="Administration"
        title="Types d’assurance"
        description="Gérez les organismes de couverture disponibles dans les dossiers patients."
        actions={
          <Button size="lg" className="gap-2 rounded-xl" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Nouveau type
          </Button>
        }
      />

      <DataTableShell title="Liste des types" description="Actifs et inactifs" icon={Shield}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nom</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Patients</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[#64748B]">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-[#64748B]">
                  Aucun type configuré.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-[#172033]">{r.name}</TableCell>
                  <TableCell className="font-mono text-sm text-[#64748B]">{r.code}</TableCell>
                  <TableCell>{r.patientCount ?? 0}</TableCell>
                  <TableCell>
                    {r.isActive ?
                      <StatusBadge tone="success" label="Actif" />
                    : <StatusBadge tone="neutral" label="Inactif" />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => setPendingDelete(r)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier le type' : 'Nouveau type d’assurance'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ins-name">Nom</Label>
              <Input
                id="ins-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ins-code">Code</Label>
              <Input
                id="ins-code"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="CNSS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ins-desc">Description</Label>
              <Input
                id="ins-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Actif (proposé aux nouveaux patients)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ou désactiver ?</AlertDialogTitle>
            <AlertDialogDescription>
              Si des patients utilisent ce type, il sera désactivé au lieu d’être supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Confirmer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
