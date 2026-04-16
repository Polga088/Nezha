'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import {
  UserPlus,
  MoreHorizontal,
  KeyRound,
  UserCheck,
  UserX,
  Shield,
  Stethoscope,
  Headphones,
  Pencil,
  Trash2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

import { UserModal } from '@/components/admin/UserModal';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { ChangePasswordModal } from '@/components/admin/ChangePasswordModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from '@/lib/utils';

export type AdminUserRow = {
  id: string;
  nom: string;
  email: string;
  role: 'ADMIN' | 'DOCTOR' | 'ASSISTANT';
  specialite: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const roleLabel: Record<AdminUserRow['role'], string> = {
  ADMIN: 'Administrateur',
  DOCTOR: 'Médecin',
  ASSISTANT: 'Assistant',
};

function RoleBadge({ role }: { role: AdminUserRow['role'] }) {
  const icon =
    role === 'ADMIN' ? (
      <Shield className="h-3 w-3" />
    ) : role === 'DOCTOR' ? (
      <Stethoscope className="h-3 w-3" />
    ) : (
      <Headphones className="h-3 w-3" />
    );
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border font-medium',
        role === 'DOCTOR' &&
          'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100',
        role === 'ASSISTANT' &&
          'border-zinc-200 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100',
        role === 'ADMIN' &&
          'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100'
      )}
    >
      {icon}
      {roleLabel[role]}
    </Badge>
  );
}

type Props = {
  /** `page` : bouton seul (h1 géré par la page). `block` : titre de section + bouton. */
  variant?: 'page' | 'block';
  sectionTitle?: string;
};

export function AdminStaffSection({
  variant = 'page',
  sectionTitle = 'Équipe',
}: Props) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetDialog, setResetDialog] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [passwordUser, setPasswordUser] = useState<AdminUserRow | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users', { credentials: 'same-origin' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error ?? 'Chargement impossible');
        setUsers([]);
        return;
      }
      const data = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.id) setMeId(String(d.id));
      })
      .catch(() => setMeId(null));
  }, []);

  const patchUser = async (id: string, body: { role?: AdminUserRow['role']; isActive?: boolean }) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data?.error ?? 'Mise à jour impossible');
      return;
    }
    toast.success('Utilisateur mis à jour');
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
  };

  const resetPassword = async (id: string, email: string) => {
    const res = await fetch(`/api/admin/users/${id}/reset-password`, {
      method: 'POST',
      credentials: 'same-origin',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data?.error ?? 'Réinitialisation impossible');
      return;
    }
    if (data.temporaryPassword) {
      setResetDialog({ email, password: data.temporaryPassword });
    }
  };

  const copyPassword = async () => {
    if (!resetDialog) return;
    try {
      await navigator.clipboard.writeText(resetDialog.password);
      toast.success('Copié dans le presse-papiers');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      const res = await fetch(`/api/users/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Suppression impossible');
        return;
      }
      toast.success('Utilisateur supprimé');
      setDeleteTarget(null);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      {variant === 'block' ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-slate-900">{sectionTitle}</h2>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-medical"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-medical"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nouvel utilisateur
          </Button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-outline-variant/15 bg-container-lowest shadow-medical">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-outline-variant/15 bg-container-high/80 hover:bg-container-high/80">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Nom
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Email
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Rôle
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Spécialité
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Statut
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Création
              </TableHead>
              <TableHead className="w-[72px] text-right text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-on-surface-variant">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-on-surface-variant">
                  Aucun utilisateur
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => {
                const isSelf = meId === u.id;
                return (
                  <TableRow key={u.id} className="border-b border-outline-variant/10">
                    <TableCell className="font-medium text-on-surface">{u.nom}</TableCell>
                    <TableCell className="text-on-surface-variant">{u.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={u.role} />
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate text-sm text-on-surface-variant">
                      {u.role === 'DOCTOR' && u.specialite ? u.specialite : '—'}
                    </TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-200 bg-emerald-50 text-emerald-800"
                        >
                          Actif
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-slate-600">
                          Inactif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-on-surface-variant">
                      {format(new Date(u.createdAt), 'dd MMM yyyy · HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-on-surface-variant hover:bg-container-low hover:text-on-surface"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-52 border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical"
                        >
                          <DropdownMenuItem onClick={() => setEditUser(u)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Changer le rôle</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {(['ADMIN', 'DOCTOR', 'ASSISTANT'] as const).map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  disabled={u.role === r || (isSelf && r !== 'ADMIN')}
                                  onClick={() => patchUser(u.id, { role: r })}
                                >
                                  {roleLabel[r]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isSelf || u.isActive}
                            onClick={() => patchUser(u.id, { isActive: true })}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Activer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isSelf || !u.isActive}
                            onClick={() => patchUser(u.id, { isActive: false })}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Désactiver
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setPasswordUser(u)}>
                            <Lock className="h-4 w-4 mr-2" />
                            Changer le mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPassword(u.id, u.email)}>
                            <KeyRound className="h-4 w-4 mr-2" />
                            Réinitialiser le mot de passe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={isSelf}
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteTarget(u)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <UserModal open={createOpen} onOpenChange={setCreateOpen} onCreated={loadUsers} />

      <EditUserModal
        open={editUser !== null}
        onOpenChange={(o) => !o && setEditUser(null)}
        user={editUser}
        meId={meId}
        onSaved={(updated) => {
          setUsers((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        }}
      />

      <ChangePasswordModal
        open={passwordUser !== null}
        onOpenChange={(o) => !o && setPasswordUser(null)}
        user={passwordUser}
      />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">Supprimer l’utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              Cette action est irréversible. Le compte de{' '}
              <span className="font-medium text-on-surface">{deleteTarget?.nom}</span> ({deleteTarget?.email})
              sera définitivement supprimé s’il n’est pas lié à des données bloquantes (ex. rendez-vous).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-outline-variant/20" disabled={deletePending}>
              Annuler
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={() => void confirmDelete()}
            >
              {deletePending ? 'Suppression…' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetDialog} onOpenChange={(o) => !o && setResetDialog(null)}>
        <DialogContent className="sm:max-w-md border border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl">
          <DialogHeader>
            <DialogTitle>Mot de passe provisoire</DialogTitle>
            <DialogDescription>
              Communiquez ce mot de passe une seule fois à {resetDialog?.email}. L’utilisateur devra le
              changer après connexion si vous imposez cette politique.
            </DialogDescription>
          </DialogHeader>
          {resetDialog && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm break-all">
              {resetDialog.password}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setResetDialog(null)}>
              Fermer
            </Button>
            <Button type="button" onClick={copyPassword} className="bg-gradient-to-b from-blue-500 to-blue-600">
              Copier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
