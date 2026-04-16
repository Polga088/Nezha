'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileKey2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Saisie manuelle du jeton document (ordonnance / facture) lorsque le QR code n’est pas scannable.
 * Redirige vers `/p/[token]` — même flux que le lien reçu.
 */
export function PublicVerificationSection() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = code.trim();
    if (!raw) return;
    const token = raw.replace(/\s+/g, '');
    if (!token) return;
    setPending(true);
    router.push(`/p/${encodeURIComponent(token)}`);
  };

  return (
    <section
      id="verification-documents"
      className="scroll-mt-24 border-b border-slate-200/60 bg-gradient-to-b from-white to-slate-50/90 py-12 sm:py-16"
      aria-labelledby="verification-heading"
    >
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-md sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileKey2 className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2
                id="verification-heading"
                className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
              >
                Vérifier un document
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Si vous ne pouvez pas scanner le QR code sur votre ordonnance ou facture, saisissez ici le
                code sécurisé (identique au lien reçu). Vous devrez ensuite confirmer votre identité.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="public-doc-token" className="text-slate-700">
                Code du document
              </Label>
              <Input
                id="public-doc-token"
                name="token"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Collez ou saisissez le code (lien sécurisé)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono text-sm sm:text-base"
                aria-describedby="public-doc-token-hint"
              />
              <p id="public-doc-token-hint" className="text-xs text-slate-500">
                Le code figure sur le document imprimé ou dans le message envoyé par le cabinet.
              </p>
            </div>
            <Button
              type="submit"
              disabled={pending || !code.trim()}
              className="h-11 w-full rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 font-semibold shadow-md shadow-blue-500/20"
            >
              {pending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Ouverture…
                </>
              ) : (
                'Accéder au document'
              )}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
