'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FileText,
  Loader2,
  Receipt,
  ShieldCheck,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCabinetMoney } from '@/lib/format-cabinet-money';

type ValidResponse = { ok: true; type: 'prescription' | 'invoice' };

type DocumentSummary = {
  type: 'prescription' | 'invoice';
  patientPrenom: string;
  patientNom: string;
  date: string;
  montant?: number;
  /** Présent pour les factures : devise cabinet (ISO). */
  currency?: string;
};

const CIN_VERIFICATION_FAILED =
  'Vérification échouée. Veuillez vérifier les informations saisies.';

function mapAccessError(status: number, bodyError: string | undefined): string {
  const e = bodyError ?? '';
  if (e.includes('non renseigné')) return e;
  if (status === 403 && (e === 'CIN incorrect' || e.toLowerCase().includes('cin'))) {
    return CIN_VERIFICATION_FAILED;
  }
  if (status === 403) return CIN_VERIFICATION_FAILED;
  return e || 'Accès refusé';
}

export default function PublicDocumentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [docType, setDocType] = useState<'prescription' | 'invoice' | null>(null);

  const [cin, setCin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pdfOpening, setPdfOpening] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyCin = useCallback(async (): Promise<boolean> => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/documents/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin, verifyOnly: true }),
      });
      const j = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        type?: 'prescription' | 'invoice';
        document?: {
          patientPrenom: string;
          patientNom: string;
          date: string;
          montant?: number;
          currency?: string;
        };
        error?: string;
      };
      if (!res.ok) {
        setError(mapAccessError(res.status, j?.error));
        return false;
      }
      if (!j.document || !j.type) {
        setError('Réponse serveur incomplète. Réessayez.');
        return false;
      }
      setSummary({
        type: j.type,
        patientPrenom: j.document.patientPrenom,
        patientNom: j.document.patientNom,
        date: j.document.date,
        montant: j.document.montant,
        currency: j.document.currency,
      });
      return true;
    } catch {
      setError('Erreur réseau. Réessayez dans un instant.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [cin, token]);

  const handleVerify = async () => {
    const ok = await verifyCin();
    if (ok) setUnlocked(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/documents/${encodeURIComponent(token)}`, {
          method: 'GET',
        });
        if (cancelled) return;
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setMetaError(
            typeof j?.error === 'string' ? j.error : 'Lien invalide ou expiré.'
          );
          return;
        }
        const data = (await res.json()) as ValidResponse;
        setDocType(data.type);
      } catch {
        setMetaError('Impossible de vérifier le lien.');
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleOpenPdfOriginal = async () => {
    setError(null);
    setPdfOpening(true);
    try {
      const res = await fetch(`/api/public/documents/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cin }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(mapAccessError(res.status, j?.error));
        return;
      }
      const blob = await res.blob();
      if (!blob.type.includes('pdf')) {
        setError('Le document n’a pas pu être chargé.');
        return;
      }
      const url = URL.createObjectURL(blob);
      const w = window.open(url, '_blank', 'noopener,noreferrer');
      if (!w) {
        setError('Autorisez les pop-ups pour afficher le PDF dans un nouvel onglet.');
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    } catch {
      setError('Erreur réseau. Réessayez dans un instant.');
    } finally {
      setPdfOpening(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl" />
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-3 px-4 text-slate-600">
          <Loader2 className="h-9 w-9 animate-spin text-blue-600" aria-hidden />
          <p className="text-sm font-medium">Vérification du lien…</p>
        </div>
      </div>
    );
  }

  if (metaError || !docType) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 to-white px-4 py-16">
        <div className="pointer-events-none absolute right-0 top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-md text-center">
          <p className="text-lg font-semibold text-slate-900">Lien non valide</p>
          <p className="mt-2 text-sm text-slate-600">
            {metaError ?? 'Ce document n’est pas disponible.'}
          </p>
          <Button variant="outline" className="mt-8 rounded-xl" asChild>
            <Link href="/">Retour à l’accueil</Link>
          </Button>
        </div>
      </div>
    );
  }

  const Icon = docType === 'invoice' ? Receipt : FileText;
  const typeLabel = docType === 'invoice' ? 'Facture' : 'Ordonnance';
  const docDate = summary?.date ? new Date(summary.date) : null;
  const patientLine =
    summary && summary.patientNom
      ? `${summary.patientPrenom} ${summary.patientNom.toUpperCase()}`
      : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-blue-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-32 h-[360px] w-[360px] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-lg px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-6">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1 text-slate-600 hover:text-slate-900" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Accueil
            </Link>
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/25">
            <Icon className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Document sécurisé
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600">
            {typeLabel} — vérification d’identité
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-900/5 backdrop-blur-md">
          <div className="border-b border-slate-100/80 bg-slate-50/80 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-start gap-3 text-sm text-amber-950">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
              <p className="leading-relaxed">
                Pour protéger vos données de santé, saisissez votre{' '}
                <strong className="font-semibold">CIN</strong> tel qu’enregistré au cabinet.
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            {!unlocked ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="public-cin" className="text-base font-medium text-slate-800">
                    Numéro CIN
                  </Label>
                  <Input
                    id="public-cin"
                    name="cin"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="Ex. AB123456"
                    value={cin}
                    onChange={(e) => setCin(e.target.value)}
                    className="h-14 border-slate-200 bg-white font-mono text-lg tracking-widest placeholder:tracking-normal placeholder:font-sans sm:text-xl"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'cin-error' : undefined}
                  />
                </div>

                {error && (
                  <p
                    id="cin-error"
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-800"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 text-base font-semibold shadow-md shadow-blue-500/20"
                  disabled={submitting || !cin.trim()}
                  onClick={() => void handleVerify()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                      Vérification…
                    </>
                  ) : (
                    'Valider mon identité'
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-6">
                <div
                  className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-center text-sm font-medium text-emerald-900 backdrop-blur-sm"
                  role="status"
                >
                  Identité confirmée. Voici le récapitulatif de votre document.
                </div>

                {summary && (
                  <dl className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-left backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Type
                        </dt>
                        <dd className="font-semibold text-slate-900">{typeLabel}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Date
                        </dt>
                        <dd className="font-medium text-slate-900 tabular-nums">
                          {docDate
                            ? format(docDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })
                            : '—'}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden />
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Patient
                        </dt>
                        <dd className="font-medium text-slate-900">{patientLine ?? '—'}</dd>
                      </div>
                    </div>
                    {summary.type === 'invoice' && summary.montant != null && (
                      <div className="border-t border-slate-200/80 pt-3">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Montant
                        </dt>
                        <dd className="text-lg font-semibold tabular-nums text-slate-900">
                          {formatCabinetMoney(
                            summary.montant,
                            summary.currency?.trim() || 'EUR'
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    type="button"
                    className="h-12 flex-1 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 text-base font-semibold shadow-md shadow-blue-500/20"
                    onClick={() => void handleOpenPdfOriginal()}
                    disabled={pdfOpening}
                  >
                    {pdfOpening ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
                        Ouverture…
                      </>
                    ) : (
                      <>
                        <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
                        Voir l&apos;original (PDF)
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-600">
                    {error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed text-slate-500">
          Besoin d&apos;aide ? Contactez votre cabinet médical. Ne communiquez jamais votre CIN par
          messagerie non sécurisée.
        </p>
      </div>
    </div>
  );
}
