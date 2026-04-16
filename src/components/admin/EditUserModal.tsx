'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import type { AdminUserRow } from '@/components/admin/AdminStaffSection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const schema = z.object({
  nom: z.string().min(1, 'Nom requis').min(2, 'Au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']),
  specialite: z.string().optional(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserRow | null;
  /** ID utilisateur connecté — restrictions sur soi-même */
  meId: string | null;
  onSaved: (updated: AdminUserRow) => void;
};

export function EditUserModal({ open, onOpenChange, user, meId, onSaved }: Props) {
  const isSelf = user != null && meId != null && user.id === meId;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      email: '',
      role: 'ASSISTANT',
      specialite: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!user || !open) return;
    form.reset({
      nom: user.nom,
      email: user.email,
      role: user.role,
      specialite: user.specialite ?? '',
      isActive: user.isActive,
    });
  }, [user, open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        nom: values.nom.trim(),
        email: values.email.trim().toLowerCase(),
        role: values.role,
        isActive: values.isActive,
        specialite:
          values.role === 'DOCTOR' ? (values.specialite?.trim() ?? '') : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data?.error ?? 'Enregistrement impossible');
      return;
    }
    toast.success('Utilisateur mis à jour');
    onSaved(data as AdminUserRow);
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-on-surface">Modifier l’utilisateur</DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Nom, email, rôle, spécialité (médecin) et statut du compte.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <form onSubmit={onSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="edit-user-nom" className="text-on-surface-variant">
                Nom
              </Label>
              <Input
                id="edit-user-nom"
                autoComplete="name"
                className="border-outline-variant/20 bg-container-lowest"
                {...form.register('nom')}
              />
              {form.formState.errors.nom && (
                <p className="text-sm text-red-600">{form.formState.errors.nom.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-email" className="text-on-surface-variant">
                Email
              </Label>
              <Input
                id="edit-user-email"
                type="email"
                autoComplete="email"
                className="border-outline-variant/20 bg-container-lowest"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-on-surface-variant">Rôle</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => {
                  form.setValue('role', v as FormValues['role']);
                  if (v !== 'DOCTOR') form.setValue('specialite', '');
                }}
                disabled={isSelf}
              >
                <SelectTrigger className="border-outline-variant/20 bg-container-lowest">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrateur</SelectItem>
                  <SelectItem value="DOCTOR">Médecin</SelectItem>
                  <SelectItem value="ASSISTANT">Assistant</SelectItem>
                </SelectContent>
              </Select>
              {isSelf && (
                <p className="text-xs text-on-surface-variant">
                  Vous ne pouvez pas modifier votre propre rôle.
                </p>
              )}
            </div>

            {form.watch('role') === 'DOCTOR' && (
              <div className="space-y-2">
                <Label htmlFor="edit-user-specialite" className="text-on-surface-variant">
                  Spécialité
                </Label>
                <Input
                  id="edit-user-specialite"
                  placeholder="Ex. Cardiologie…"
                  className="border-outline-variant/20 bg-container-lowest"
                  {...form.register('specialite')}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant/15 bg-container-low/60 px-3 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-user-active" className="text-base text-on-surface">
                  Compte actif
                </Label>
                <p className="text-xs text-on-surface-variant">
                  Désactiver empêche la connexion. Vous ne pouvez pas désactiver votre propre compte.
                </p>
              </div>
              <Switch
                id="edit-user-active"
                checked={form.watch('isActive')}
                onCheckedChange={(v) => form.setValue('isActive', v)}
                disabled={isSelf}
              />
            </div>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-medical"
              >
                {form.formState.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
