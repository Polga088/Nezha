'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HeartPulse, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });

      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide (attendu JSON). Exécutez `npx prisma generate` puis redémarrez.');
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Identifiants invalides');
      }

      toast.success("Connexion réussie ! Redirection...");

      const role = data.user.role;
      const target =
        role === 'ADMIN'
          ? '/dashboard/admin'
          : role === 'DOCTOR'
            ? '/dashboard/doctor'
            : role === 'ASSISTANT'
              ? '/dashboard/assistant'
              : '/dashboard';

      // Rechargement complet pour que le cookie httpOnly soit bien pris en compte
      window.location.href = target;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[rgb(var(--clinical-surface-rgb))] px-4 py-10">
      {/* Décor médical tonal — halos bleus diffus, pas de bordures dures */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-blue-200/30 blur-[120px]" />
        <div className="absolute -bottom-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-indigo-200/30 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.18) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="animate-fade-in-up z-10 w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-medical-blue">
            <HeartPulse size={32} strokeWidth={2.25} aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Nezha Medical
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Connectez-vous pour accéder à votre espace sécurisé.
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 p-6 shadow-medical-lg ring-1 ring-slate-900/[0.05] backdrop-blur-sm sm:p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                Adresse email
              </Label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="marie@clinique.com"
                  className="h-12 rounded-xl pl-10 text-[15px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Mot de passe
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-12 rounded-xl pl-10 text-[15px]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="h-12 w-full rounded-xl text-base font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Authentification…
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span>
              Aucune inscription en ligne — les comptes sont créés par l&apos;administration du
              cabinet. Accès réservé au personnel habilité.
            </span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Nezha Medical — Plateforme clinique sécurisée
        </p>
      </div>
    </div>
  );
}
