'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale/fr'
import { toast } from 'sonner'
import {
  Clock,
  Stethoscope,
  Users,
  CalendarCheck,
  AlertTriangle,
  ChevronRight,
  FileText,
  X as XIcon,
  Activity,
  UserCheck,
} from 'lucide-react'

import {
  buildAppointmentsQuery,
  buildWaitingQueueQuery,
  getTodayRange,
} from '@/lib/appointments-range'
import { APPOINTMENT_STATUS_LABEL } from '@/lib/appointment-status'
import { cn } from '@/lib/utils'

const fetcher = (url: string) =>
  fetch(url, { credentials: 'same-origin' }).then((r) => {
    if (!r.ok) throw new Error()
    return r.json()
  })

type Me = { id: string; role: string; nom?: string; prenom?: string }

type TodayAppt = {
  id: string
  date_heure: string
  motif: string
  statut: string
  arrivalTime?: string | null
  appointmentType?: string | null
  patient_id: string
  patient: { prenom: string; nom: string }
}

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string }> = {
  WAITING_ROOM: {
    bg: 'bg-amber-100/70',
    text: 'text-amber-800/85',
    dot: 'bg-amber-400/90',
  },
  WAITING: {
    bg: 'bg-sky-100/70',
    text: 'text-sky-800/85',
    dot: 'bg-sky-400/90',
  },
  IN_PROGRESS: {
    bg: 'bg-violet-100/75',
    text: 'text-violet-800/90',
    dot: 'bg-violet-400',
  },
  FINISHED: {
    bg: 'bg-emerald-100/70',
    text: 'text-emerald-800/85',
    dot: 'bg-emerald-400/90',
  },
  PAID: {
    bg: 'bg-emerald-100/70',
    text: 'text-emerald-800/85',
    dot: 'bg-emerald-500/80',
  },
  CANCELED: {
    bg: 'bg-slate-100/90',
    text: 'text-slate-600',
    dot: 'bg-slate-400/80',
  },
}

/** Pastilles type RDV — pastels, libellés courts type produit. */
const TYPE_PILL: Record<string, { className: string; label: string }> = {
  URGENT: {
    className:
      'border-0 bg-red-100/80 text-[10px] font-semibold uppercase tracking-wider text-red-700/90',
    label: 'URGENT',
  },
  FIRST_VISIT: {
    className:
      'border-0 bg-emerald-100/70 text-[10px] font-semibold uppercase tracking-wider text-emerald-800/90',
    label: '1ère visite',
  },
  FOLLOW_UP: {
    className:
      'border-0 bg-sky-100/80 text-[10px] font-semibold uppercase tracking-wider text-sky-800/85',
    label: 'SUIVI',
  },
}

export default function DoctorDashboard() {
  const { data: me } = useSWR<Me>('/api/auth/me', fetcher, {
    revalidateOnFocus: true,
  })

  const [now, setNow] = useState(() => new Date())
  const [closingId, setClosingId] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const appointmentsUrl = useMemo(() => {
    if (!me) return null
    const q = buildAppointmentsQuery(getTodayRange(), {
      doctorId: me.role === 'DOCTOR' ? me.id : null,
      role: me.role,
    })
    return `/api/appointments?${q}`
  }, [me])

  const waitingQueueUrl = useMemo(() => {
    if (!me) return null
    return `/api/appointments?${buildWaitingQueueQuery(getTodayRange())}`
  }, [me])

  const { data: appointments, isLoading: apptsLoading, mutate: mutateAppts } = useSWR<TodayAppt[]>(
    appointmentsUrl,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true }
  )

  const { data: waitingQueue, isLoading: queueLoading, mutate: mutateQueue } = useSWR<TodayAppt[]>(
    waitingQueueUrl,
    fetcher,
    { refreshInterval: 20_000, revalidateOnFocus: true }
  )

  const list = Array.isArray(appointments) ? appointments : []
  const sortedToday = useMemo(
    () =>
      [...list].sort(
        (a, b) => new Date(a.date_heure).getTime() - new Date(b.date_heure).getTime()
      ),
    [list]
  )

  const queue = Array.isArray(waitingQueue) ? waitingQueue : []

  const inProgressAppt = useMemo(
    () => sortedToday.find((a) => a.statut === 'IN_PROGRESS'),
    [sortedToday]
  )

  const nextUrgent = useMemo(
    () => queue.find((a) => a.appointmentType === 'URGENT'),
    [queue]
  )

  const completedCount = useMemo(
    () => sortedToday.filter((a) => a.statut === 'FINISHED' || a.statut === 'PAID').length,
    [sortedToday]
  )

  const canceledCount = useMemo(
    () => sortedToday.filter((a) => a.statut === 'CANCELED').length,
    [sortedToday]
  )

  const statusLabel = (a: TodayAppt): string => {
    if (a.statut === 'WAITING' && a.arrivalTime) return 'En salle d\u2019attente'
    return APPOINTMENT_STATUS_LABEL[a.statut] ?? a.statut
  }

  const statusKey = (a: TodayAppt): string => {
    if (a.statut === 'WAITING' && a.arrivalTime) return 'WAITING_ROOM'
    return a.statut
  }

  const waitMinutes = (a: TodayAppt): number | null => {
    if (!a.arrivalTime) return null
    return differenceInMinutes(now, new Date(a.arrivalTime))
  }

  const handleStartConsultation = useCallback(
    async (apptId: string) => {
      try {
        await fetch(`/api/appointments/${apptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ statut: 'IN_PROGRESS' }),
        })
        toast.success('Consultation démarrée')
        mutateAppts()
        mutateQueue()
      } catch {
        toast.error('Erreur lors du démarrage')
      }
    },
    [mutateAppts, mutateQueue]
  )

  const handleCloseConsultation = useCallback(
    async (apptId: string) => {
      setClosingId(apptId)
      try {
        const res = await fetch(`/api/appointments/${apptId}/close`, {
          method: 'POST',
          credentials: 'same-origin',
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error || 'Erreur lors de la clôture')
          return
        }
        toast.success('Consultation clôturée')
        mutateAppts()
        mutateQueue()
      } catch {
        toast.error('Erreur réseau')
      } finally {
        setClosingId(null)
      }
    },
    [mutateAppts, mutateQueue]
  )

  const greeting = useMemo(() => {
    const h = now.getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }, [now])

  const doctorName = me?.nom
    ? `Dr. ${me.nom}`
    : ''

  const isLoading = apptsLoading || queueLoading

  return (
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <header className="mb-8 space-y-1">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
          {format(now, 'EEEE d MMMM yyyy', { locale: fr })}
        </p>
        <h1 className="text-2xl font-light tracking-tight text-slate-700">
          {greeting}{doctorName ? `, ${doctorName}` : ''}
        </h1>
      </header>

      {/* Main Grid — 70 / 30 asymétrique */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        {/* ===== LEFT COLUMN (70%) ===== */}
        <div className="min-w-0 space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <KpiCard
              label="Rendez-vous"
              value={isLoading ? '—' : sortedToday.length}
              icon={<CalendarCheck className="h-5 w-5" strokeWidth={1.25} aria-hidden />}
              accent="blue"
            />
            <KpiCard
              label="File d'attente"
              value={isLoading ? '—' : queue.length}
              icon={<Users className="h-5 w-5" strokeWidth={1.25} aria-hidden />}
              accent="amber"
            />
            <KpiCard
              label="Terminés"
              value={isLoading ? '—' : completedCount}
              icon={<UserCheck className="h-5 w-5" strokeWidth={1.25} aria-hidden />}
              accent="emerald"
            />
            <KpiCard
              label="Annulés"
              value={isLoading ? '—' : canceledCount}
              icon={<XIcon className="h-5 w-5" strokeWidth={1.25} aria-hidden />}
              accent="slate"
            />
          </div>

          {/* Current Consultation Banner */}
          {inProgressAppt && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 p-5 text-white shadow-lg">
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -right-16 h-32 w-32 rounded-full bg-white/5" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-widest text-white/70">
                    En consultation
                  </p>
                  <p className="mt-1 truncate text-xl font-semibold">
                    {inProgressAppt.patient.prenom} {inProgressAppt.patient.nom}
                  </p>
                  <p className="mt-0.5 text-sm text-white/80">
                    {format(new Date(inProgressAppt.date_heure), 'HH:mm', { locale: fr })} — {inProgressAppt.motif}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/dashboard/patients/${inProgressAppt.patient_id}`}
                    className="rounded-xl bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-colors hover:bg-white/30"
                    tabIndex={0}
                    aria-label={`Voir dossier de ${inProgressAppt.patient.prenom} ${inProgressAppt.patient.nom}`}
                  >
                    Dossier
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleCloseConsultation(inProgressAppt.id)}
                    disabled={closingId === inProgressAppt.id}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-50 disabled:opacity-50"
                    aria-label="Clôturer cette consultation"
                  >
                    {closingId === inProgressAppt.id ? 'Clôture…' : 'Clôturer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Waiting Queue */}
          <section aria-label="File d'attente">
            <div className="mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                File d&apos;attente
              </h2>
              {!queueLoading && (
                <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-100 px-2 text-xs font-bold text-amber-700">
                  {queue.length}
                </span>
              )}
            </div>

            {queueLoading && <LoadingSkeleton count={3} />}

            {!queueLoading && queue.length === 0 && (
              <div className="rounded-2xl border-0 bg-white py-14 text-center shadow-sm">
                <Users className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">
                  Aucun patient en file d&apos;attente
                </p>
              </div>
            )}

            <div>
              {queue.map((rdv, idx) => {
                const mins = waitMinutes(rdv)
                const isUrgent = rdv.appointmentType === 'URGENT'
                const isHovered = hoveredCard === `queue-${rdv.id}`
                return (
                  <div
                    key={rdv.id}
                    className="group relative mb-3 rounded-2xl border-0 bg-white p-5 shadow-none transition-all duration-200 last:mb-0 hover:bg-slate-50/90 hover:shadow-md hover:ring-1 hover:ring-slate-100"
                    onMouseEnter={() => setHoveredCard(`queue-${rdv.id}`)}
                    onMouseLeave={() => setHoveredCard(null)}
                    role="article"
                    aria-label={`Patient ${rdv.patient.prenom} ${rdv.patient.nom}`}
                  >
                    {isUrgent && (
                      <div className="absolute -left-0.5 top-3 bottom-3 w-1 rounded-full bg-red-500" />
                    )}
                    <div className="flex items-center gap-5">
                      <span className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-colors duration-200',
                        isUrgent
                          ? 'bg-red-50 text-red-600'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                      )}>
                        {idx + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/patients/${rdv.patient_id}`}
                            className="truncate text-lg font-semibold text-slate-800 transition-colors hover:text-blue-600"
                            tabIndex={0}
                            aria-label={`Voir dossier ${rdv.patient.prenom} ${rdv.patient.nom}`}
                          >
                            {rdv.patient.prenom} {rdv.patient.nom}
                          </Link>
                          {isUrgent && (
                            <span className="inline-flex items-center gap-1 rounded-full border-0 bg-red-100/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700/90">
                              <AlertTriangle className="h-3 w-3" />
                              Urgent
                            </span>
                          )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span>{format(new Date(rdv.date_heure), 'HH:mm', { locale: fr })}</span>
                          <span className="text-slate-300">·</span>
                          <span className="truncate">{rdv.motif}</span>
                          {mins != null && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <Clock className="h-3.5 w-3.5" />
                                {mins} min
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <StatusBadge statusKey={statusKey(rdv)} label={statusLabel(rdv)} />

                      {/* Hover Actions */}
                      <div className={cn(
                        'flex shrink-0 gap-2 transition-all duration-200',
                        isHovered ? 'opacity-100 translate-x-0' : 'pointer-events-none opacity-0 translate-x-2'
                      )}>
                        {rdv.statut === 'WAITING' && (
                          <button
                            type="button"
                            onClick={() => handleStartConsultation(rdv.id)}
                            className="rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md hover:from-blue-600 hover:to-blue-700"
                            aria-label={`Démarrer consultation pour ${rdv.patient.prenom} ${rdv.patient.nom}`}
                          >
                            <Stethoscope className="h-4 w-4" />
                          </button>
                        )}
                        <Link
                          href={`/dashboard/patients/${rdv.patient_id}`}
                          className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200"
                          tabIndex={0}
                          aria-label={`Dossier ${rdv.patient.prenom} ${rdv.patient.nom}`}
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Today's Schedule */}
          <section aria-label="Planning du jour">
            <div className="mb-4 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold tracking-tight text-slate-800">
                Planning du jour
              </h2>
              {!apptsLoading && (
                <span className="ml-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-bold text-blue-600">
                  {sortedToday.length}
                </span>
              )}
            </div>

            {apptsLoading && <LoadingSkeleton count={4} />}

            {!apptsLoading && sortedToday.length === 0 && (
              <div className="rounded-2xl border-0 bg-white py-14 text-center shadow-sm">
                <CalendarCheck className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 text-sm text-slate-400">
                  Aucun rendez-vous aujourd&apos;hui
                </p>
              </div>
            )}

            <div>
              {sortedToday.map((rdv) => {
                const isActive = rdv.statut === 'IN_PROGRESS'
                const isDone = rdv.statut === 'FINISHED' || rdv.statut === 'PAID'
                const isCanceled = rdv.statut === 'CANCELED'
                const isHovered = hoveredCard === `sched-${rdv.id}`
                const typePill = rdv.appointmentType ? TYPE_PILL[rdv.appointmentType] : null
                return (
                  <div
                    key={rdv.id}
                    className={cn(
                      'group relative mb-3 rounded-2xl border-0 p-5 shadow-none transition-all duration-200 ease-out last:mb-0',
                      isActive &&
                        'bg-violet-50/90 ring-1 ring-violet-200/80 hover:bg-violet-50 hover:shadow-md',
                      isDone &&
                        'bg-white hover:bg-slate-50/90 hover:shadow-md hover:ring-1 hover:ring-slate-100',
                      isCanceled && 'bg-slate-50/60 hover:bg-slate-100/50',
                      !isActive &&
                        !isDone &&
                        !isCanceled &&
                        'bg-white hover:bg-slate-50/90 hover:shadow-md hover:ring-1 hover:ring-slate-100'
                    )}
                    onMouseEnter={() => setHoveredCard(`sched-${rdv.id}`)}
                    onMouseLeave={() => setHoveredCard(null)}
                    role="article"
                    aria-label={`RDV ${rdv.patient.prenom} ${rdv.patient.nom}`}
                  >
                    <div className="flex items-center gap-5">
                      {/* Time Column */}
                      <div className="w-16 shrink-0 text-center">
                        <p className={cn(
                          'text-lg font-semibold tabular-nums',
                          isCanceled ? 'text-slate-400 line-through' : 'text-slate-700'
                        )}>
                          {format(new Date(rdv.date_heure), 'HH:mm', { locale: fr })}
                        </p>
                      </div>

                      {/* Type Indicator Line */}
                      <div className="flex flex-col items-center gap-1 self-stretch py-1">
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full',
                            rdv.appointmentType === 'URGENT' && 'bg-red-300',
                            rdv.appointmentType === 'FIRST_VISIT' && 'bg-emerald-400',
                            (!rdv.appointmentType || rdv.appointmentType === 'FOLLOW_UP') &&
                              'bg-sky-400',
                            isCanceled && 'opacity-40'
                          )}
                        />
                        <div className="h-full min-h-[1rem] w-px bg-slate-200/80" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/patients/${rdv.patient_id}`}
                            className={cn(
                              'truncate font-semibold transition-colors hover:text-blue-600',
                              isCanceled ? 'text-slate-400 line-through' : 'text-slate-800'
                            )}
                            tabIndex={0}
                            aria-label={`Dossier ${rdv.patient.prenom} ${rdv.patient.nom}`}
                          >
                            {rdv.patient.prenom} {rdv.patient.nom}
                          </Link>
                          {typePill && !isCanceled && (
                            <span className={cn('rounded-md px-2 py-0.5', typePill.className)}>
                              {typePill.label}
                            </span>
                          )}
                        </div>
                        <p className={cn(
                          'mt-1.5 truncate text-sm',
                          isCanceled ? 'text-slate-400' : 'text-slate-500'
                        )}>
                          {rdv.motif}
                        </p>
                      </div>

                      {/* Badge */}
                      <StatusBadge statusKey={statusKey(rdv)} label={statusLabel(rdv)} />

                      {/* Hover Actions */}
                      {!isDone && !isCanceled && (
                        <div
                          className={cn(
                            'flex shrink-0 gap-2 transition-all duration-200',
                            isHovered
                              ? 'opacity-100 translate-x-0'
                              : 'pointer-events-none opacity-0 translate-x-2'
                          )}
                        >
                          {rdv.statut === 'WAITING' && (
                            <button
                              type="button"
                              onClick={() => handleStartConsultation(rdv.id)}
                              className="rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md"
                              aria-label="Démarrer consultation"
                            >
                              <Stethoscope className="h-4 w-4" />
                            </button>
                          )}
                          {rdv.statut === 'IN_PROGRESS' && (
                            <button
                              type="button"
                              onClick={() => handleCloseConsultation(rdv.id)}
                              disabled={closingId === rdv.id}
                              className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                              aria-label="Clôturer consultation"
                            >
                              {closingId === rdv.id ? '…' : 'Clôturer'}
                            </button>
                          )}
                          <Link
                            href={`/dashboard/patients/${rdv.patient_id}`}
                            className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-200"
                            tabIndex={0}
                            aria-label="Voir dossier"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                        </div>
                      )}

                      <Link
                        href={`/dashboard/patients/${rdv.patient_id}`}
                        className="flex shrink-0 items-center text-slate-300 transition-colors hover:text-blue-500"
                        tabIndex={0}
                        aria-label={`Ouvrir le dossier — ${rdv.patient.prenom} ${rdv.patient.nom}`}
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* ===== RIGHT COLUMN (30%) — Contextual Panel ===== */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:h-fit">
          {/* Quick Glance Card */}
          <div className="overflow-hidden rounded-2xl border-0 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Aperçu rapide
            </h3>

            <div className="mt-6 space-y-6">
              <QuickStat
                label="RDV total"
                value={isLoading ? '—' : String(sortedToday.length)}
                accent="blue"
              />
              <QuickStat
                label="En attente"
                value={isLoading ? '—' : String(queue.length)}
                accent="amber"
              />
              <QuickStat
                label="Terminés"
                value={isLoading ? '—' : String(completedCount)}
                accent="emerald"
              />
            </div>

            {/* Progress ring */}
            {!isLoading && sortedToday.length > 0 && (
              <div className="mt-6 flex items-center gap-4">
                <ProgressRing
                  completed={completedCount}
                  total={sortedToday.length - canceledCount}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-700">Progression</p>
                  <p className="text-xs text-slate-400">
                    {completedCount}/{sortedToday.length - canceledCount} consultations
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Next Urgent Patient */}
          {nextUrgent && (
            <div className="overflow-hidden rounded-2xl border-0 bg-rose-50/70 p-6 shadow-sm ring-1 ring-rose-100/80">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-red-600">
                  Prochain urgent
                </h3>
              </div>
              <div className="mt-3">
                <Link
                  href={`/dashboard/patients/${nextUrgent.patient_id}`}
                  className="text-lg font-semibold text-slate-800 transition-colors hover:text-red-600"
                  tabIndex={0}
                  aria-label={`Dossier urgent ${nextUrgent.patient.prenom} ${nextUrgent.patient.nom}`}
                >
                  {nextUrgent.patient.prenom} {nextUrgent.patient.nom}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {format(new Date(nextUrgent.date_heure), 'HH:mm', { locale: fr })} — {nextUrgent.motif}
                </p>
                {nextUrgent.arrivalTime && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-600">
                    <Clock className="h-3.5 w-3.5" />
                    Attend depuis {differenceInMinutes(now, new Date(nextUrgent.arrivalTime))} min
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleStartConsultation(nextUrgent.id)}
                className="mt-4 w-full rounded-xl bg-gradient-to-b from-red-500 to-red-600 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
                aria-label="Recevoir patient urgent"
              >
                Recevoir maintenant
              </button>
            </div>
          )}

          {/* Current Time Card */}
          <div className="rounded-2xl border-0 bg-slate-900 p-6 text-white shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Heure actuelle
            </p>
            <p className="mt-2 text-4xl font-light tabular-nums tracking-tight text-white">
              {format(now, 'HH:mm')}
            </p>
            <p className="mt-1 text-sm text-slate-400 capitalize">
              {format(now, 'EEEE d MMMM', { locale: fr })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

/* ── Sub-Components ──────────────────────────────────────────────── */

const KpiCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  accent: 'blue' | 'amber' | 'emerald' | 'slate'
}) => {
  const iconColors = {
    blue: 'text-blue-500',
    amber: 'text-amber-500',
    emerald: 'text-emerald-500',
    slate: 'text-slate-400',
  }
  return (
    <div className="rounded-2xl border-0 bg-white p-6 shadow-none transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className={cn('opacity-90', iconColors[accent])}>{icon}</span>
      </div>
      <p className="mt-4 text-4xl font-light tabular-nums text-blue-600">
        {value}
      </p>
      <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-400">
        {label}
      </p>
    </div>
  )
}

const StatusBadge = ({ statusKey: sk, label }: { statusKey: string; label: string }) => {
  const style = STATUS_BADGE[sk] ?? STATUS_BADGE.WAITING
  return (
    <span className={cn(
      'inline-flex shrink-0 items-center gap-1.5 rounded-full border-0 px-3.5 py-1.5 text-xs font-semibold',
      style.bg,
      style.text
    )}>
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {label}
    </span>
  )
}

const QuickStat = ({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: 'blue' | 'amber' | 'emerald'
}) => {
  const colors = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
  }
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs font-medium uppercase tracking-widest text-slate-400">{label}</span>
      <span className={cn('text-4xl font-light tabular-nums', colors[accent])}>{value}</span>
    </div>
  )
}

const ProgressRing = ({ completed, total }: { completed: number; total: number }) => {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const radius = 26
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
      <svg className="h-[4.5rem] w-[4.5rem] -rotate-90" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="2" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums text-slate-600">
        {pct}%
      </span>
    </div>
  )
}

const LoadingSkeleton = ({ count }: { count: number }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="mb-3 animate-pulse rounded-2xl border-0 bg-white p-5 shadow-sm last:mb-0">
        <div className="flex items-center gap-5">
          <div className="h-9 w-9 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/5 rounded bg-slate-200" />
            <div className="h-3 w-3/5 rounded bg-slate-200" />
          </div>
          <div className="h-6 w-20 rounded-full bg-slate-200" />
        </div>
      </div>
    ))}
  </div>
)
