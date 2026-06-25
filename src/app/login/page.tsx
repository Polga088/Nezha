'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  CalendarCheck,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const HIGHLIGHTS = [
  { icon: Stethoscope, label: 'Consultations', desc: 'Suivi en temps réel' },
  { icon: Users, label: 'Dossiers patients', desc: 'Historique centralisé' },
  { icon: CalendarCheck, label: 'Agenda médical', desc: 'RDV & file d\'attente' },
];

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
        throw new Error(
          'Réponse serveur invalide (attendu JSON). Exécutez `npx prisma generate` puis redémarrez.'
        );
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Identifiants invalides');

      toast.success('Connexion réussie ! Redirection...');

      const role = data.user.role;
      const target =
        role === 'ADMIN'
          ? '/dashboard/admin'
          : role === 'DOCTOR'
            ? '/dashboard/doctor'
            : role === 'ASSISTANT'
              ? '/dashboard/assistant'
              : '/dashboard';

      window.location.href = target;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FB]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-[#2563EB]/8 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#06B6D4]/6 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div
            data-testid="login-split-grid"
            className="grid grid-cols-1 overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_16px_48px_-12px_rgba(23,32,51,0.12)] lg:grid-cols-[1.05fr_0.95fr]"
          >
            {/* Panneau branding — clair */}
            <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-[#EFF6FF] via-[#F8FAFC] to-[#ECFEFF] p-10 lg:flex xl:p-12">
              <div className="space-y-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-[0_8px_24px_-4px_rgba(37,99,235,0.4)]">
                    <HeartPulse className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <p className="text-xl font-bold text-[#172033]">Nezha Medical</p>
                    <p className="text-sm text-[#64748B]">Plateforme clinique</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#172033] xl:text-4xl">
                    Votre espace de travail
                    <span className="text-[#2563EB]"> clinique</span>
                  </h2>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-[#64748B]">
                    Patients, consultations, agenda et facturation — un environnement
                    professionnel, clair et sécurisé pour votre équipe soignante.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: '2 400+', l: 'Dossiers' },
                    { v: '99.9%', l: 'Uptime' },
                    { v: '< 2s', l: 'Réponse' },
                  ].map(({ v, l }) => (
                    <div
                      key={l}
                      className="rounded-2xl border border-[#E2E8F0] bg-white/80 p-4 text-center"
                    >
                      <p className="text-xl font-bold text-[#2563EB]">{v}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#64748B]">
                        {l}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {HIGHLIGHTS.map(({ icon: Icon, label, desc }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white/70 p-4"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#172033]">{label}</p>
                        <p className="text-xs text-[#64748B]">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D1FAE5] bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#10B981]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                  Données sécurisées
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-semibold text-[#64748B]">
                  <Activity className="h-3.5 w-3.5" aria-hidden />
                  Conforme RGPD
                </span>
              </div>
            </aside>

            {/* Formulaire */}
            <main className="flex flex-col justify-center p-8 sm:p-10 xl:p-14">
              <div className="mb-6 flex flex-col items-center text-center lg:hidden">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white">
                  <HeartPulse className="h-6 w-6" aria-hidden />
                </span>
                <h1 className="text-xl font-bold text-[#172033]">Nezha Medical</h1>
              </div>

              <div className="mx-auto w-full max-w-md">
                <div className="mb-6 hidden lg:block">
                  <h1 className="text-2xl font-bold text-[#172033]">Connexion</h1>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Accédez à votre espace professionnel
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5" data-testid="login-form">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <Input
                        id="email"
                        data-testid="login-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="marie@clinique.com"
                        className="h-12 rounded-xl pl-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Mot de passe</Label>
                      <Link href="/forgot-password" className="text-xs font-semibold text-[#2563EB] hover:underline">
                        Oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                      <Input
                        id="password"
                        data-testid="login-password"
                        type="password"
                        required
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="h-12 rounded-xl pl-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" disabled={loading} className="h-12 w-full rounded-xl">
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

                <p className="mt-6 flex items-start gap-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-xs leading-relaxed text-[#64748B]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" aria-hidden />
                  Accès réservé au personnel habilité. Comptes créés par l&apos;administration du cabinet.
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
