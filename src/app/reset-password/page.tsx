'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { HeartPulse, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

function ResetPasswordInner() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas.')
      return
    }
    if (!token) {
      toast.error('Lien invalide.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide.')
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      toast.success(data.message ?? 'Mot de passe mis à jour.')
      setDone(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const invalidLink = !token

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50/50 px-4">
      <div className="absolute top-0 z-0 hidden h-1/2 w-full border-b border-slate-100 bg-white md:block" />

      <div className="z-10 w-full max-w-md animate-fade-in duration-500 zoom-in-95">
        <div className="mb-8 flex justify-center">
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/30">
            <HeartPulse size={36} />
          </div>
        </div>

        <Card className="border-slate-200/60 shadow-medical">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-800">
              Nouveau mot de passe
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Choisissez un mot de passe sécurisé (minimum 8 caractères).
            </CardDescription>
          </CardHeader>

          {invalidLink ? (
            <CardContent className="space-y-4 pb-8">
              <p className="rounded-lg border border-amber-100 bg-amber-50/90 p-4 text-sm text-amber-950">
                Ce lien est incomplet ou expiré. Demandez une nouvelle réinitialisation
                depuis la page de connexion.
              </p>
              <Button asChild className="w-full" variant="outline">
                <Link href="/forgot-password">Demander un nouveau lien</Link>
              </Button>
            </CardContent>
          ) : done ? (
            <CardContent className="space-y-4 pb-8">
              <p className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                Votre mot de passe a été mis à jour. Vous pouvez vous connecter.
              </p>
              <Button
                asChild
                className="h-12 w-full rounded-xl bg-blue-600 font-bold text-white shadow-sm"
              >
                <Link href="/login">Se connecter</Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="rp-pass" className="font-bold text-slate-700">
                    Nouveau mot de passe
                  </Label>
                  <Input
                    id="rp-pass"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-12 rounded-xl border-slate-200 transition-all focus-visible:border-blue-500 focus-visible:ring-blue-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rp-confirm" className="font-bold text-slate-700">
                    Confirmer
                  </Label>
                  <Input
                    id="rp-confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className="h-12 rounded-xl border-slate-200 transition-all focus-visible:border-blue-500 focus-visible:ring-blue-500"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pb-8">
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-blue-600 text-base font-bold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99]"
                >
                  {loading ? 'Enregistrement…' : 'Enregistrer'}
                </Button>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  Retour à la connexion
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50/50 text-slate-500">
          Chargement…
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  )
}
