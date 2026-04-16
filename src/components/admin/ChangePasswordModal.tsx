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
import { generateSecurePasswordClient } from '@/lib/generate-secure-password-client';
import { cn } from '@/lib/utils';

const schema = z.object({
  newPassword: z.string().min(8, 'Au moins 8 caractères'),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUserRow | null;
};

export const ChangePasswordModal = ({ open, onOpenChange, user }: Props) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '' },
  });

  useEffect(() => {
    if (!open || !user) return;
    form.reset({ newPassword: '' });
  }, [open, user, form]);

  const handleGenerateSecure = () => {
    form.setValue('newPassword', generateSecurePasswordClient(), { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (!user) return;
    const res = await fetch(`/api/admin/users/${user.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ password: values.newPassword.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(typeof data?.error === 'string' ? data.error : 'Mise à jour impossible');
      return;
    }
    toast.success('Mot de passe mis à jour');
    form.reset({ newPassword: '' });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'sm:max-w-md border border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl'
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-on-surface">Changer le mot de passe</DialogTitle>
          <DialogDescription className="text-on-surface-variant">
            Définissez un nouveau mot de passe pour{' '}
            <span className="font-medium text-on-surface">{user?.nom}</span>. L’ancien mot de passe
            n’est jamais affiché ni stocké en clair.
          </DialogDescription>
        </DialogHeader>

        {user && (
          <form onSubmit={onSubmit} className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="change-pw-new" className="text-on-surface-variant">
                Nouveau mot de passe
              </Label>
              <Input
                id="change-pw-new"
                type="password"
                autoComplete="new-password"
                className="border-outline-variant/20 bg-container-lowest"
                aria-invalid={!!form.formState.errors.newPassword}
                aria-describedby={
                  form.formState.errors.newPassword ? 'change-pw-new-error' : undefined
                }
                {...form.register('newPassword')}
              />
              {form.formState.errors.newPassword && (
                <p id="change-pw-new-error" className="text-sm text-red-600" role="alert">
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-outline-variant/20 shadow-medical"
              onClick={handleGenerateSecure}
            >
              Générer un mot de passe sécurisé
            </Button>

            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="border-outline-variant/20"
                onClick={() => onOpenChange(false)}
              >
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
};
