'use client'

import { useState } from 'react'
import Link from 'next/link'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide.')
      }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      toast.success(data.message ?? 'Demande enregistrée.')
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

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
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Saisissez l&apos;email de votre compte personnel. Si celui-ci existe, vous
              recevrez un lien de réinitialisation.
            </CardDescription>
          </CardHeader>

          {sent ? (
            <CardContent className="space-y-4 pb-2">
              <p className="rounded-lg border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
                Si un compte correspond à cette adresse, un email a été envoyé. Vérifiez
                votre boîte de réception et le dossier indésirables.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Retour à la connexion</Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="fp-email" className="font-bold text-slate-700">
                    Adresse email
                  </Label>
                  <Input
                    id="fp-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="vous@clinique.com"
                    className="h-12 rounded-xl border-slate-200 font-medium transition-all focus-visible:border-blue-500 focus-visible:ring-blue-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
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
