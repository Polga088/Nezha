'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';

const sidebarBtnClass =
  'p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50';

/** Invalide la session (cookie) via POST /api/auth/logout — sans redirection (toast + location par l’appelant). */
export async function performClientLogout(): Promise<void> {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    throw new Error('logout failed');
  }
}

type LogoutLinkProps = {
  /** `sidebar` : bouton icône seul (sidebars admin/doctor/assistant) */
  variant?: 'default' | 'sidebar';
  className?: string;
  children?: ReactNode;
  title?: string;
};

export function LogoutLink({
  variant = 'default',
  className,
  children,
  title = 'Déconnexion',
}: LogoutLinkProps) {
  const [mounted, setMounted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mergedClass =
    variant === 'sidebar'
      ? [sidebarBtnClass, className].filter(Boolean).join(' ')
      : className ?? 'text-red-500 hover:text-red-700 flex items-center gap-2';

  const handleLogout = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await performClientLogout();
      toast.success('Déconnexion réussie');
      window.location.href = '/login';
    } catch {
      toast.error('Impossible de se déconnecter.');
      setIsPending(false);
    }
  };

  const label = children ?? 'Déconnexion';

  /** SSR + premier paint client : texte uniquement — pas d’icône Lucide → pas de mismatch. */
  if (!mounted) {
    return (
      <button
        type="button"
        title={title}
        disabled={isPending}
        onClick={handleLogout}
        className={mergedClass}
      >
        {variant === 'sidebar' ? (
          <span className="text-xs font-semibold text-slate-500">{title}</span>
        ) : (
          label
        )}
      </button>
    );
  }

  /** Après hydratation : icône Lucide + libellé (ou icône seule en sidebar). */
  return (
    <button
      type="button"
      title={title}
      disabled={isPending}
      onClick={handleLogout}
      className={mergedClass}
    >
      {variant === 'sidebar' ? (
        <LogOut size={18} aria-hidden />
      ) : (
        <>
          <LogOut size={20} aria-hidden />
          {label}
        </>
      )}
    </button>
  );
}
