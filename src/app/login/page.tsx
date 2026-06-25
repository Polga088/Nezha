'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  HeartPulse,
  Loader2,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const STATS = [
  { value: '2 400+', label: 'Dossiers gérés' },
  { value: '99.9%', label: 'Disponibilité' },
  { value: '< 2s', label: 'Temps de réponse' },
];

const FEATURES = [
  { icon: Stethoscope, label: 'Consultations live', desc: "File d'attente & statuts en temps réel" },
  { icon: Users, label: 'Dossiers centralisés', desc: 'Historique clinique complet' },
  { icon: BarChart3, label: 'Pilotage cabinet', desc: 'KPI, revenus & analytics' },
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

      if (!res.ok) {
        throw new Error(data.error || 'Identifiants invalides');
      }

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
    <div className="relative min-h-screen overflow-hidden bg-[#eef2f8]">
      {/* Fond global */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-[480px] w-[480px] rounded-full bg-indigo-400/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.22) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-7xl">
          {/* Grille split-screen desktop / stack mobile */}
          <div
            data-testid="login-split-grid"
            className="grid min-h-0 grid-cols-1 overflow-hidden rounded-[2rem] shadow-[0_32px_80px_-20px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/10 lg:min-h-[min(720px,calc(100vh-4rem))] lg:grid-cols-[1.1fr_0.9fr]"
          >
            {/* ── Colonne gauche : branding (masquée mobile) ── */}
            <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f2744] to-[#1e3a5f] p-8 xl:p-12 lg:flex">
              <div
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 30% 20%, rgba(59,130,246,0.35) 0%, transparent 55%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.2) 0%, transparent 50%)',
                }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }}
                aria-hidden
              />

              <div className="relative z-10 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white shadow-[0_8px_32px_rgba(37,99,235,0.4)] ring-1 ring-white/20 backdrop-blur-sm">
                    <HeartPulse size={28} strokeWidth={2} aria-hidden />
                  </div>
                  <div>
                    <p className="text-2xl font-bold tracking-tight text-white">Nezha Medical</p>
                    <p className="text-sm font-medium text-blue-200/70">Plateforme clinique premium</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-100 ring-1 ring-white/15 backdrop-blur-sm">
                    <Zap className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                    Solution certifiée santé
                  </div>
                  <h2 className="text-4xl font-bold leading-[1.1] tracking-tight text-white xl:text-[2.75rem]">
                    Gestion clinique
                    <br />
                    <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                      précise &amp; sécurisée
                    </span>
                  </h2>
                  <p className="max-w-md text-base leading-relaxed text-slate-300/90">
                    Dossiers patients, agenda, consultations et facturation — conçu pour les
                    équipes médicales exigeantes.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {STATS.map(({ value, label }) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur-sm"
                    >
                      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-200/60">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {FEATURES.map(({ icon: Icon, label, desc }) => (
                    <div
                      key={label}
                      className="flex items-center gap-4 rounded-2xl bg-white/8 p-4 ring-1 ring-white/10 backdrop-blur-sm"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/20 text-blue-200 ring-1 ring-white/15">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{label}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                  <Shield className="h-3.5 w-3.5" aria-hidden />
                  Données chiffrées
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-200 ring-1 ring-blue-400/20">
                  <Activity className="h-3.5 w-3.5" aria-hidden />
                  Conforme RGPD
                </span>
              </div>
            </aside>

            {/* ── Colonne droite : formulaire unique ── */}
            <main className="relative flex flex-col justify-center bg-gradient-to-br from-white via-slate-50/80 to-blue-50/30 p-6 sm:p-10 xl:p-14">
              <div
                className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl"
                aria-hidden
              />

              {/* Branding mobile uniquement */}
              <div className="relative z-10 mb-6 flex flex-col items-center text-center lg:hidden">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-medical-blue">
                  <HeartPulse size={26} strokeWidth={2} aria-hidden />
                </div>
                <h1 className="text-xl font-bold text-slate-900">Nezha Medical</h1>
                <p className="text-sm text-slate-500">Plateforme clinique sécurisée</p>
              </div>

              <div className="relative z-10 mx-auto w-full max-w-md">
                <div className="mb-6 hidden lg:block">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900">Connexion</h1>
                  <p className="mt-2 text-sm text-slate-500">
                    Accédez à votre espace professionnel sécurisé
                  </p>
                </div>

                <div className="rounded-3xl bg-white/90 p-7 shadow-medical ring-1 ring-slate-900/[0.05] backdrop-blur-md sm:p-8">
                  <div className="mb-5 lg:hidden">
                    <h2 className="text-xl font-bold text-slate-900">Connexion</h2>
                    <p className="mt-1 text-sm text-slate-500">Espace personnel sécurisé</p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5" data-testid="login-form">
                    <div className="space-y-2">
                      <Label htmlFor="email">Adresse email</Label>
                      <div className="relative">
                        <Mail
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden
                        />
                        <Input
                          id="email"
                          data-testid="login-email"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="marie@clinique.com"
                          className="h-12 pl-11"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Mot de passe</Label>
                        <Link
                          href="/forgot-password"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          Oublié ?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden
                        />
                        <Input
                          id="password"
                          data-testid="login-password"
                          type="password"
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="h-12 pl-11"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <Button type="submit" size="lg" disabled={loading} className="h-12 w-full text-base">
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

                  <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-900/[0.04]">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                    <p className="text-xs leading-relaxed text-slate-500">
                      Accès réservé au personnel habilité. Comptes créés par l&apos;administration
                      du cabinet uniquement.
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-center text-xs text-slate-400 lg:hidden">
                  © {new Date().getFullYear()} Nezha Medical
                </p>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
