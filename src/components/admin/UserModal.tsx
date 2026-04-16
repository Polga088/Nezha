'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { cn } from '@/lib/utils';

const schema = z.object({
  nom: z.string().min(1, 'Nom requis').min(2, 'Au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  role: z.enum(['ADMIN', 'DOCTOR', 'ASSISTANT']),
  specialite: z.string().optional(),
  password: z.union([z.literal(''), z.string().min(8, 'Min. 8 caractères si renseigné')]),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function UserModal({ open, onOpenChange, onCreated }: Props) {
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: '',
      email: '',
      role: 'ASSISTANT',
      specialite: '',
      password: '',
    },
  });

  const role = form.watch('role');

  const onSubmit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      const password =
        values.password.trim().length >= 8 ? values.password.trim() : undefined;
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          nom: values.nom.trim(),
          email: values.email.trim().toLowerCase(),
          role: values.role,
          ...(values.role === 'DOCTOR'
            ? { specialite: values.specialite?.trim() ?? '' }
            : {}),
          ...(password ? { password } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? 'Création impossible');
        return;
      }
      toast.success('Utilisateur créé');
      if (data.temporaryPassword) {
        toast.message('Mot de passe provisoire', {
          description: data.temporaryPassword,
          duration: 30_000,
        });
      }
      form.reset({
        nom: '',
        email: '',
        role: 'ASSISTANT',
        specialite: '',
        password: '',
      });
      onOpenChange(false);
      onCreated();
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-md border border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl'
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-on-surface">Nouvel utilisateur</DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Laissez le mot de passe vide pour générer un mot de passe provisoire (affiché ici et
            envoyé par e-mail). Un lien pour définir un mot de passe personnel est également envoyé
            au nouvel utilisateur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="user-modal-nom" className="text-on-surface-variant">
              Nom
            </Label>
            <Input
              id="user-modal-nom"
              autoComplete="name"
              className="border-outline-variant/20 bg-container-lowest"
              {...form.register('nom')}
            />
            {form.formState.errors.nom && (
              <p className="text-sm text-destructive">{form.formState.errors.nom.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-modal-email" className="text-on-surface-variant">
              Email
            </Label>
            <Input
              id="user-modal-email"
              type="email"
              autoComplete="email"
              className="border-outline-variant/20 bg-container-lowest"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-on-surface-variant">Rôle</Label>
            <Select
              value={form.watch('role')}
              onValueChange={(v) => {
                form.setValue('role', v as FormValues['role']);
                if (v !== 'DOCTOR') {
                  form.setValue('specialite', '');
                }
              }}
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
          </div>

          {role === 'DOCTOR' && (
            <div className="space-y-2">
              <Label htmlFor="user-modal-specialite" className="text-on-surface-variant">
                Spécialité
              </Label>
              <Input
                id="user-modal-specialite"
                placeholder="Ex. Cardiologie, Médecine générale…"
                className="border-outline-variant/20 bg-container-lowest"
                {...form.register('specialite')}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="user-modal-pw" className="text-on-surface-variant">
              Mot de passe (optionnel)
            </Label>
            <Input
              id="user-modal-pw"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 caractères ou vide pour génération auto"
              className="border-outline-variant/20 bg-container-lowest"
              {...form.register('password')}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-medical"
            >
              {pending ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
