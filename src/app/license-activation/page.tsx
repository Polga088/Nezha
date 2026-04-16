'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { HeartPulse, KeyRound } from 'lucide-react'
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

const DEVICE_STORAGE = 'nezha_device_id'

const schema = z.object({
  key: z.string().min(8, 'Saisissez la clé fournie par UST.'),
})

type FormValues = z.infer<typeof schema>

export default function LicenseActivationPage() {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { key: '' },
  })

  useEffect(() => {
    try {
      let id = window.localStorage.getItem(DEVICE_STORAGE)
      if (!id) {
        id = crypto.randomUUID()
        window.localStorage.setItem(DEVICE_STORAGE, id)
      }
      setDeviceId(id)
    } catch {
      const id = crypto.randomUUID()
      setDeviceId(id)
    }
  }, [])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!deviceId) {
      toast.error('Initialisation appareil en cours…')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: values.key.trim(),
          deviceId,
        }),
      })

      const ct = res.headers.get('content-type') ?? ''
      if (!ct.includes('application/json')) {
        throw new Error('Réponse serveur invalide.')
      }

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Activation impossible')
      }

      toast.success(data.message || 'Licence activée.')
      window.location.href = '/login'
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  })

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50/80 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-lg shadow-blue-600/25">
            <HeartPulse className="h-9 w-9" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Nezha Medical
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Activation de la licence logicielle
            </p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-slate-200/40">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
              <KeyRound className="h-5 w-5 text-blue-600" aria-hidden />
              Clé fournie par UST
            </CardTitle>
            <CardDescription className="text-slate-600">
              Saisissez la clé qui vous a été communiquée. Sans licence valide,
              l&apos;application reste verrouillée.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license-key">Clé de licence</Label>
                <Input
                  id="license-key"
                  type="text"
                  autoComplete="off"
                  placeholder="XXXX-XXXX-…"
                  disabled={loading || !deviceId}
                  aria-invalid={!!form.formState.errors.key}
                  aria-describedby={
                    form.formState.errors.key ? 'license-key-error' : undefined
                  }
                  {...form.register('key')}
                />
                {form.formState.errors.key && (
                  <p
                    id="license-key-error"
                    className="text-sm text-red-600"
                    role="alert"
                  >
                    {form.formState.errors.key.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full bg-gradient-to-b from-blue-500 to-blue-600"
                disabled={loading || !deviceId}
              >
                {loading ? 'Vérification…' : 'Activer la licence'}
              </Button>
              <p className="text-center text-xs text-slate-500">
                Un identifiant technique anonyme est mémorisé sur cet appareil
                pour la liaison licence / poste.
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
