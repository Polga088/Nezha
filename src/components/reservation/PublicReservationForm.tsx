'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  PUBLIC_RESERVATION_FIELD_LIMITS,
  type PublicReservationConfig,
  type PublicReservationSlot,
} from '@/lib/public-reservation';

type ReservationFormProps = {
  initialConfig: PublicReservationConfig;
};

type ReservationFormValues = {
  doctorId: string;
  date: string;
  time: string;
  insuranceTypeId: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: 'MASCULIN' | 'FEMININ';
  tel: string;
  email: string;
  cin: string;
  adresse: string;
  motif: string;
  consentAccepted: boolean;
  honeypot: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PublicReservationForm({ initialConfig }: ReservationFormProps) {
  const router = useRouter();
  const [config] = useState(initialConfig);
  const [slots, setSlots] = useState<PublicReservationSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(
    null
  );
  const [values, setValues] = useState<ReservationFormValues>(() => ({
    doctorId: initialConfig.doctors[0]?.doctorId ?? '',
    date: todayIsoDate(),
    time: '',
    insuranceTypeId: '',
    nom: '',
    prenom: '',
    date_naissance: '',
    sexe: 'MASCULIN',
    tel: '',
    email: '',
    cin: '',
    adresse: '',
    motif: '',
    consentAccepted: false,
    honeypot: '',
  }));

  const privacyUrl = useMemo(
    () => config.cndp.privacyUrl?.trim() || '/politique-confidentialite',
    [config.cndp.privacyUrl]
  );

  useEffect(() => {
    if (!values.doctorId || !values.date) {
      setSlots([]);
      setValues((current) => ({ ...current, time: '' }));
      return;
    }

    const controller = new AbortController();
    let mounted = true;
    setLoadingSlots(true);
    setMessage(null);

    fetch(
      `/api/public/reservation/slots?doctorId=${encodeURIComponent(values.doctorId)}&date=${encodeURIComponent(values.date)}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('slots');
        return (await res.json()) as { slots?: PublicReservationSlot[] };
      })
      .then((data) => {
        if (!mounted) return;
        const nextSlots = Array.isArray(data.slots) ? data.slots : [];
        setSlots(nextSlots);
        setValues((current) =>
          nextSlots.some((slot) => slot.label === current.time)
            ? current
            : { ...current, time: '' }
        );
      })
      .catch(() => {
        if (mounted) setSlots([]);
      })
      .finally(() => {
        if (mounted) setLoadingSlots(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [values.doctorId, values.date]);

  const selectedDoctor = config.doctors.find((doctor) => doctor.doctorId === values.doctorId) ?? null;
  const normalizedEmail = normalizeEmail(values.email);

  const canSubmit =
    !submitting &&
    Boolean(
      values.doctorId &&
        values.date &&
        values.time &&
        values.nom.trim() &&
        values.prenom.trim() &&
        values.date_naissance &&
        values.tel.trim() &&
        values.motif.trim() &&
        values.consentAccepted
    );

  const update = (key: keyof ReservationFormValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      if (normalizedEmail && !isValidEmail(normalizedEmail)) {
        throw new Error('Email invalide : vérifiez le format de l’adresse saisie.');
      }

      const response = await fetch('/api/public/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorId: values.doctorId,
          date: values.date,
          time: values.time,
          nom: values.nom,
          prenom: values.prenom,
          date_naissance: values.date_naissance,
          sexe: values.sexe,
          tel: values.tel,
          email: normalizedEmail || null,
          insuranceTypeId: values.insuranceTypeId || null,
          cin: values.cin,
          adresse: values.adresse,
          motif: values.motif,
          consentAccepted: values.consentAccepted,
          consentVersion: config.cndp.version,
          consentTextSnapshot: config.cndp.text,
          honeypot: values.honeypot,
          reservationSource: 'RESERVATION_PUBLIC',
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : 'Erreur lors de la réservation');
      }

      const confirmationUrl = typeof payload?.confirmationUrl === 'string'
        ? payload.confirmationUrl
        : '/reservation';
      setMessage({ kind: 'success', text: 'Réservation enregistrée avec succès.' });
      router.push(confirmationUrl);
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Impossible d’enregistrer la réservation.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="clinical-panel space-y-6 p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Réservation publique
            </p>
            <h1 className="text-3xl font-bold text-slate-900">
              Prendre rendez-vous en ligne
            </h1>
            <p className="text-sm text-slate-600">
              Choisissez un médecin, une date et un créneau disponibles, puis confirmez votre demande en quelques étapes.
            </p>
          </div>

          {message ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                message.kind === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" value={values.honeypot} onChange={(event) => update('honeypot', event.target.value)} />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Médecin</span>
                <select
                  className="clinical-input"
                  value={values.doctorId}
                  onChange={(event) => update('doctorId', event.target.value)}
                  required
                >
                  <option value="">Choisir un médecin</option>
                  {config.doctors.map((doctor) => (
                    <option key={doctor.doctorId} value={doctor.doctorId}>
                      {doctor.nom}
                      {doctor.specialite ? ` — ${doctor.specialite}` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Date</span>
                <input
                  type="date"
                  className="clinical-input"
                  min={todayIsoDate()}
                  value={values.date}
                  onChange={(event) => update('date', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Créneau</span>
                <select
                  className="clinical-input"
                  value={values.time}
                  onChange={(event) => update('time', event.target.value)}
                  required
                  disabled={!values.doctorId || !values.date || loadingSlots}
                >
                  <option value="">{loadingSlots ? 'Chargement…' : 'Choisir un créneau'}</option>
                  {slots.map((slot) => (
                    <option key={slot.start} value={slot.label}>
                      {slot.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Motif</span>
                <input
                  className="clinical-input"
                  maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.motif}
                  value={values.motif}
                  onChange={(event) => update('motif', event.target.value)}
                  placeholder="Ex. consultation de contrôle"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Nom</span>
                <input
                  className="clinical-input"
                  maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.nom}
                  value={values.nom}
                  onChange={(event) => update('nom', event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Prénom</span>
                <input
                  className="clinical-input"
                  maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.prenom}
                  value={values.prenom}
                  onChange={(event) => update('prenom', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Date de naissance</span>
                <input
                  type="date"
                  className="clinical-input"
                  value={values.date_naissance}
                  onChange={(event) => update('date_naissance', event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Sexe</span>
                <select
                  className="clinical-input"
                  value={values.sexe}
                  onChange={(event) => update('sexe', event.target.value as ReservationFormValues['sexe'])}
                  required
                >
                  <option value="MASCULIN">Masculin</option>
                  <option value="FEMININ">Féminin</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Téléphone</span>
                <input
                  className="clinical-input"
                  maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.tel}
                  value={values.tel}
                  onChange={(event) => update('tel', event.target.value)}
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email (facultatif)</span>
                <input
                  type="email"
                  className="clinical-input"
                  maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.email}
                  value={values.email}
                  onChange={(event) => update('email', event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">CIN facultative</span>
                <input
                  className="clinical-input"
                  maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.cin}
                  value={values.cin}
                  onChange={(event) => update('cin', event.target.value)}
                />
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Assurance</span>
              <select
                className="clinical-input"
                value={values.insuranceTypeId}
                onChange={(event) => update('insuranceTypeId', event.target.value)}
              >
                <option value="">Aucune / Non renseignée</option>
                {config.insuranceTypes.map((insuranceType) => (
                  <option key={insuranceType.id} value={insuranceType.id}>
                    {insuranceType.label}
                    {insuranceType.code ? ` — ${insuranceType.code}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 block">
              <span className="text-sm font-medium text-slate-700">Adresse facultative</span>
              <textarea
                className="clinical-input h-auto min-h-24 py-3"
                maxLength={PUBLIC_RESERVATION_FIELD_LIMITS.adresse}
                value={values.adresse}
                onChange={(event) => update('adresse', event.target.value)}
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                checked={values.consentAccepted}
                onChange={(event) => update('consentAccepted', event.target.checked)}
                required
              />
              <span className="text-sm text-slate-700">
                {config.cndp.text}{' '}
                <a
                  href={privacyUrl}
                  className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2"
                >
                  Politique de confidentialité
                </a>
              </span>
            </label>

            <button type="submit" className="clinical-button w-full" disabled={!canSubmit}>
              {submitting ? 'Enregistrement…' : 'Enregistrer la réservation'}
            </button>
          </form>
        </section>

        <aside className="space-y-6">
          <section className="clinical-panel space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Cabinet
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">{config.branding.cabinetName}</h2>
            </div>
            <dl className="space-y-3 text-sm text-slate-700">
              <div>
                <dt className="font-medium text-slate-500">Téléphone</dt>
                <dd>{config.branding.phone || '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd>{config.branding.email || '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Adresse</dt>
                <dd className="whitespace-pre-line">{config.branding.address || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="clinical-panel space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Rappel
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">Créneaux disponibles</h2>
            </div>
            {selectedDoctor ? (
              <p className="text-sm text-slate-600">
                {selectedDoctor.nom}
                {selectedDoctor.specialite ? ` — ${selectedDoctor.specialite}` : ''}
              </p>
            ) : null}
            <p className="text-sm text-slate-600">
              Les créneaux affichés sont filtrés en temps réel selon la disponibilité du médecin et les rendez-vous déjà pris.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {slots.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2">
                  {slots.map((slot) => (
                    <li key={slot.start} className="rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                      {slot.label}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aucun créneau disponible sur cette date.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
