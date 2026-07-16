'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { View } from 'react-big-calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { toast } from 'sonner';
import useSWR from 'swr';
import { Check, ChevronDown, Loader2, X } from 'lucide-react';

import {
  Calendar as AgendaCalendar,
  type AgendaCalendarEvent,
} from '@/components/agenda/Calendar';
import { PlanifierUnCreneau, type InitialPresence } from '@/components/agenda/PlanifierUnCreneau';
import type { AppointmentType, BookingChannel } from '@/generated/prisma/client';
import { colorForAppointmentType } from '@/lib/appointment-types';
import { getAppointmentWorkflowLabel, isPublicReservationPending } from '@/lib/appointment-status';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { getVisibleRange, buildAppointmentsQuery } from '@/lib/appointments-range';
import { cn } from '@/lib/utils';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-override.css';

const FILTER_ALL_VALUE = '__ALL__';
const PATIENT_SEARCH_MIN_CHARS = 2;
const PATIENT_SEARCH_LIMIT = 20;
const PATIENT_SEARCH_DEBOUNCE_MS = 350;

type PatientSearchResult = {
  id: string;
  nom: string;
  prenom: string;
  tel: string | null;
  cin: string | null;
  date_naissance: string | null;
};

type AppointmentApiRow = {
  id: string;
  motif: string;
  date_heure: string;
  statut: string;
  color?: string | null;
  appointmentType: AppointmentType;
  reservationSource?: string | null;
  publicValidatedAt?: string | null;
  publicValidatedById?: string | null;
  patient?: { nom?: string | null; prenom?: string | null; tel?: string | null } | null;
  doctor?: { nom?: string | null } | null;
};

function formatPatientBirthDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, 'dd/MM/yyyy');
}

const appointmentsFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(typeof err?.error === 'string' ? err.error : 'Erreur API');
  }
  return res.json();
};

function AgendaPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agendaPrefillApplied = useRef(false);
  const patientSearchSeq = useRef(0);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreatePatientMode, setIsCreatePatientMode] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState<string | null>(null);
  const [motif, setMotif] = useState('');
  /** Tél. affiché quand arrivée depuis la fiche patient (query patient_tel) */
  const [prefillTelDisplay, setPrefillTelDisplay] = useState('');
  const [newPat, setNewPat] = useState({ nom: '', prenom: '', tel: '', date_naissance: '' });
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('FOLLOW_UP');
  const [bookingChannel, setBookingChannel] = useState<BookingChannel>('PHONE');
  const [initialPresence, setInitialPresence] = useState<InitialPresence>('confirmed');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | undefined>(undefined);
  const [sessionReady, setSessionReady] = useState(false);
  const [doctors, setDoctors] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  /** Filtre agenda (optionnel) ; admin / assistante : '' = tous les médecins */
  const [agendaFilterDoctorId, setAgendaFilterDoctorId] = useState('');
  /** Uniquement si admin + vue « tous les médecins » : médecin du nouveau RDV dans le panneau */
  const [sheetDoctorId, setSheetDoctorId] = useState('');
  /** Médecin du RDV (formulaire) — obligatoire pour ASSISTANT ; `name="doctorId"` */
  const [rdvDoctorId, setRdvDoctorId] = useState('');
  const [pendingPublicAction, setPendingPublicAction] = useState<'validate' | 'reject' | null>(null);
  const [pendingActionLoading, setPendingActionLoading] = useState(false);

  const needsDoctorSelect = userRole === 'ASSISTANT' || userRole === 'ADMIN';

  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date());
  const [calendarView, setCalendarView] = useState<View>('week');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.id) setCurrentUserId(d.id);
        if (d?.role) setUserRole(d.role);
      })
      .finally(() => setSessionReady(true));
  }, []);

  const range = useMemo(
    () => getVisibleRange(calendarDate, calendarView),
    [calendarDate, calendarView]
  );

  const agendaAppointmentsKey = useMemo(() => {
    if (!sessionReady) return null;
    if (userRole === 'DOCTOR' && !currentUserId) return null;

    const q = buildAppointmentsQuery(range, {
      doctorId: currentUserId,
      role: userRole,
      agendaFilterDoctorId:
        userRole === 'ADMIN' || userRole === 'ASSISTANT' ? agendaFilterDoctorId || null : null,
    });
    return `/api/appointments?${q}`;
  }, [sessionReady, userRole, currentUserId, agendaFilterDoctorId, range]);

  const {
    data: appointmentsRaw,
    mutate,
    isLoading: appointmentsLoading,
    isValidating: appointmentsValidating,
  } = useSWR(agendaAppointmentsKey, appointmentsFetcher, {
    revalidateOnFocus: true,
    onError: (err) => {
      console.error('[Agenda] SWR appointments', err);
      toast.error('Impossible de charger les rendez-vous.');
    },
  });

  const appointments = useMemo(
    () => (Array.isArray(appointmentsRaw) ? (appointmentsRaw as AppointmentApiRow[]) : []),
    [appointmentsRaw]
  );

  const events: AgendaCalendarEvent[] = useMemo(() => {
    return appointments.map((a) => {
      const workflowLabel = getAppointmentWorkflowLabel(a);
      const titleParts: string[] = [];
      if (a.reservationSource === 'RESERVATION_PUBLIC') {
        titleParts.push('Réservation en ligne');
      }
      if (workflowLabel && workflowLabel !== 'En attente') {
        titleParts.push(workflowLabel);
      }
      titleParts.push(`${a.patient?.nom ?? '?'} - ${a.motif}`);

      return {
        id: a.id,
        title: titleParts.join(' · '),
        start: new Date(a.date_heure),
        end: new Date(new Date(a.date_heure).getTime() + 30 * 60000),
        color: a.color ?? colorForAppointmentType(a.appointmentType),
      };
    });
  }, [appointments]);

  const selectedAppointment = useMemo(
    () => appointments.find((appointment) => appointment.id === selectedAppointmentId) ?? null,
    [appointments, selectedAppointmentId]
  );

  useEffect(() => {
    if (!sessionReady || !needsDoctorSelect) return;
    let cancelled = false;
    fetch('/api/users/doctors')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('doctors'))))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setDoctors(data);
      })
      .catch((e) => console.error('[Agenda] fetch doctors', e));
    return () => {
      cancelled = true;
    };
  }, [sessionReady, needsDoctorSelect]);

  useEffect(() => {
    if (!needsDoctorSelect || doctors.length !== 1 || userRole !== 'ASSISTANT') return;
    setAgendaFilterDoctorId((prev) => (prev ? prev : doctors[0].id));
  }, [needsDoctorSelect, doctors, userRole]);

  /** Pré-remplissage depuis /dashboard/patients/[id] (?patient_id=&patient_name=&patient_tel=) */
  useEffect(() => {
    if (agendaPrefillApplied.current) return;
    const pid = searchParams.get('patient_id');
    if (!pid) return;

    agendaPrefillApplied.current = true;
    setIsCreatePatientMode(false);
    setSelectedPatientId(pid);

    const pname = searchParams.get('patient_name');
    if (pname) {
      setMotif(`Consultation - ${decodeURIComponent(pname)}`);
    }

    const ptel = searchParams.get('patient_tel');
    setPrefillTelDisplay(ptel ? decodeURIComponent(ptel) : '');

    router.replace('/dashboard/agenda', { scroll: false });
  }, [searchParams, router]);

  const onEventDrop = useCallback(
    async ({ event, start }: { event: AgendaCalendarEvent; start: Date; end: Date }) => {
      try {
        const res = await fetch(`/api/appointments/${event.id}`, {
          method: 'PUT',
          body: JSON.stringify({ date_heure: start.toISOString() }),
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error();
        await mutate();
        toast.success('Rendez-vous déplacé !');
      } catch {
        await mutate();
        toast.error('Impossible de décaler en Base de Données.');
      }
    },
    [mutate]
  );

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedAppointmentId(null);
    setSelectedSlot(slotInfo);
    setRdvDoctorId((prev) => (prev.trim() ? prev : agendaFilterDoctorId));
    setIsSheetOpen(true);
    setIsCreatePatientMode(false);
    setPatientSearchOpen(false);
  };

  const handleSelectEvent = (event: AgendaCalendarEvent) => {
    setSelectedSlot(null);
    setSelectedAppointmentId(event.id);
    setIsSheetOpen(true);
    setIsCreatePatientMode(false);
    setPatientSearchOpen(false);
  };

  const handleNavigate = useCallback((newDate: Date) => {
    setCalendarDate(newDate);
  }, []);

  const handleViewChange = useCallback((nextView: View) => {
    setCalendarView(nextView);
  }, []);

  const showDoctorFieldInSheet =
    needsDoctorSelect && userRole === 'ADMIN' && !agendaFilterDoctorId;

  const resetAppointmentForm = () => {
    setIsSheetOpen(false);
    setSelectedSlot(null);
    setSelectedAppointmentId(null);
    setIsCreatePatientMode(false);
    setMotif('');
    setAppointmentType('FOLLOW_UP');
    setBookingChannel('PHONE');
    setInitialPresence('confirmed');
    setSelectedPatientId('');
    setSelectedPatient(null);
    setPatientSearchQuery('');
    setPatientSearchResults([]);
    setPatientSearchError(null);
    setPatientSearchLoading(false);
    setPatientSearchOpen(false);
    setPrefillTelDisplay('');
    setSheetDoctorId('');
    setRdvDoctorId('');
    setNewPat({ nom: '', prenom: '', tel: '', date_naissance: '' });
  };

  const updateAppointmentLocally = useCallback(
    async (updatedAppointment: AppointmentApiRow) => {
      await mutate(
        (current: AppointmentApiRow[] | undefined) => {
          if (!Array.isArray(current)) return current;
          return current.map((appointment) =>
            appointment.id === updatedAppointment.id
              ? { ...appointment, ...updatedAppointment }
              : appointment
          );
        },
        { revalidate: false }
      );
    },
    [mutate]
  );

  const performPublicAction = useCallback(
    async (action: 'validate' | 'reject') => {
      if (!selectedAppointment) return;

      setPendingActionLoading(true);
      try {
        const res = await fetch(`/api/appointments/${selectedAppointment.id}/${action}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          const message =
            typeof payload?.error === 'string' ? payload.error : 'Action impossible';
          if (res.status === 409) {
            toast.error(message);
            setPendingPublicAction(null);
          } else {
            throw new Error(message);
          }
          return;
        }

        const updatedAppointment = payload?.appointment as AppointmentApiRow | undefined;
        if (updatedAppointment) {
          await updateAppointmentLocally(updatedAppointment);
        }
        toast.success(action === 'validate' ? 'Réservation validée.' : 'Demande refusée.');
        setPendingPublicAction(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Erreur serveur');
      } finally {
        setPendingActionLoading(false);
      }
    },
    [selectedAppointment, updateAppointmentLocally]
  );

  const submitRDV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || (!selectedPatientId && !isCreatePatientMode)) return;

    const effectiveDoctorId =
      userRole === 'DOCTOR'
        ? currentUserId
        : userRole === 'ASSISTANT'
          ? rdvDoctorId.trim()
          : agendaFilterDoctorId || sheetDoctorId;

    if (!effectiveDoctorId) {
      toast.error(
        userRole === 'DOCTOR'
          ? 'Session invalide : impossible de déterminer le médecin.'
          : userRole === 'ASSISTANT'
            ? 'Veuillez sélectionner un médecin traitant dans le formulaire.'
            : 'Veuillez sélectionner un médecin traitant.'
      );
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        date_heure: selectedSlot.start.toISOString(),
        motif,
        doctor_id: effectiveDoctorId,
        doctorId: effectiveDoctorId,
        appointmentType,
        bookingChannel,
        initialPresence,
      };
      if (isCreatePatientMode) payload.new_patient = newPat;
      else payload.patient_id = selectedPatientId;

      const res = await fetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('[Agenda] POST appointment', err);
        const msg =
          typeof err?.error === 'string' ? err.error : 'Erreur lors de la création du rendez-vous';
        throw new Error(msg);
      }

      await mutate();
      toast.success('Rendez-vous planifié avec succès !', {
        description: 'L’agenda a été synchronisé.',
      });
      resetAppointmentForm();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la création du rendez-vous');
    }
  };

  const isCalendarRefreshing = Boolean(agendaAppointmentsKey) && (appointmentsLoading || appointmentsValidating);

  const handleOpenNewAppointment = () => {
    const start = new Date();
    const mins = start.getMinutes();
    const remainder = mins % 30;
    const addMins = remainder === 0 ? 0 : 30 - remainder;
    start.setMinutes(mins + addMins, 0, 0);
    if (start.getTime() <= Date.now()) {
      start.setMinutes(start.getMinutes() + 30, 0, 0);
    }
    const end = new Date(start.getTime() + 30 * 60000);
    setSelectedAppointmentId(null);
    setSelectedSlot({ start, end });
    setRdvDoctorId((prev) => (prev.trim() ? prev : agendaFilterDoctorId));
    setIsSheetOpen(true);
    setIsCreatePatientMode(false);
    setPatientSearchOpen(false);
  };

  const selectedAppointmentWorkflowLabel = selectedAppointment
    ? getAppointmentWorkflowLabel(selectedAppointment)
    : '';
  const selectedAppointmentIsPublicPending = selectedAppointment
    ? isPublicReservationPending(selectedAppointment)
    : false;
  const selectedAppointmentStartLabel = selectedAppointment
    ? format(new Date(selectedAppointment.date_heure), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })
    : '';

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-120px)] animate-fade-in relative z-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Agenda Praticien</h1>
        <Button
          type="button"
          onClick={handleOpenNewAppointment}
          className="shrink-0 rounded-xl bg-blue-600 px-5 text-white hover:bg-blue-700"
          aria-label="Ouvrir le formulaire pour un nouveau rendez-vous"
        >
          Nouveau rendez-vous
        </Button>
      </div>

      {needsDoctorSelect ? (
        <Card className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 flex-1 max-w-md">
            <Label htmlFor="agenda-filter-doctor">
              {userRole === 'ADMIN' ? 'Afficher l’agenda' : 'Médecin'}
            </Label>
            {userRole === 'ADMIN' ? (
              <Select
                value={agendaFilterDoctorId ? agendaFilterDoctorId : FILTER_ALL_VALUE}
                onValueChange={(v) =>
                  setAgendaFilterDoctorId(v === FILTER_ALL_VALUE ? '' : v)
                }
              >
                <SelectTrigger id="agenda-filter-doctor" className="w-full">
                  <SelectValue placeholder="Choisir une vue" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL_VALUE}>Tous les médecins</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.prenom ? `${d.nom} ${d.prenom}` : d.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={agendaFilterDoctorId ? agendaFilterDoctorId : FILTER_ALL_VALUE}
                onValueChange={(v) =>
                  setAgendaFilterDoctorId(v === FILTER_ALL_VALUE ? '' : v)
                }
              >
                <SelectTrigger id="agenda-filter-doctor" className="w-full">
                  <SelectValue placeholder="Vue agenda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FILTER_ALL_VALUE}>Tous les médecins</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.prenom ? `${d.nom} ${d.prenom}` : d.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {userRole === 'ASSISTANT' && doctors.length > 1 && !agendaFilterDoctorId ? (
              <p className="text-xs text-slate-600">
                Aucun filtre : tous les rendez-vous du cabinet sont affichés. Choisissez un médecin pour
                restreindre la vue.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="flex min-h-0 flex-grow flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <AgendaCalendar
          date={calendarDate}
          view={calendarView}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          events={events}
          onEventDrop={onEventDrop}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          isRefreshing={isCalendarRefreshing}
          style={{ height: '100%' }}
        />
      </Card>

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) {
            resetAppointmentForm();
            return;
          }
          setIsSheetOpen(true);
        }}
      >
        <SheetContent className="bg-white overflow-y-auto">
          {selectedAppointment ? (
            <>
              <SheetHeader>
                <SheetTitle>Rendez-vous</SheetTitle>
                <SheetDescription>{selectedAppointmentStartLabel}</SheetDescription>
              </SheetHeader>

              <div className="mt-8 space-y-5">
                <div className="flex flex-wrap gap-2">
                  {selectedAppointment.reservationSource === 'RESERVATION_PUBLIC' ? (
                    <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                      Réservation en ligne
                    </Badge>
                  ) : null}
                  {selectedAppointment.reservationSource === 'RESERVATION_PUBLIC' ? (
                    <Badge
                      className={cn(
                        selectedAppointment.statut === 'CANCELED'
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-100'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                      )}
                    >
                      {selectedAppointment.statut === 'CANCELED'
                        ? 'Annulé'
                        : selectedAppointmentWorkflowLabel}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {selectedAppointmentWorkflowLabel}
                    </Badge>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Patient</div>
                    <div className="font-semibold text-slate-900">
                      {selectedAppointment.patient?.prenom ?? '—'}{' '}
                      {selectedAppointment.patient?.nom ?? ''}
                    </div>
                    {selectedAppointment.patient?.tel ? (
                      <div className="text-slate-600">{selectedAppointment.patient.tel}</div>
                    ) : null}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Médecin</div>
                    <div className="font-semibold text-slate-900">
                      {selectedAppointment.doctor?.nom ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Motif</div>
                    <div className="text-slate-700">{selectedAppointment.motif}</div>
                  </div>
                </div>

                {selectedAppointmentIsPublicPending ? (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={pendingActionLoading}
                      onClick={() => setPendingPublicAction('validate')}
                    >
                      Valider le rendez-vous
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={pendingActionLoading}
                      onClick={() => setPendingPublicAction('reject')}
                    >
                      Refuser la demande
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Planifier un Créneau</SheetTitle>
                <SheetDescription>
                  {selectedSlot &&
                    format(selectedSlot.start, 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
                </SheetDescription>
              </SheetHeader>

              <form onSubmit={submitRDV} className="mt-8 space-y-6">
                {userRole === 'ASSISTANT' ? (
                  <div className="space-y-2">
                    <Label htmlFor="doctorId">
                      Médecin traitant <span className="text-red-600">*</span>
                    </Label>
                    <select
                      id="doctorId"
                      name="doctorId"
                      required
                      value={rdvDoctorId}
                      onChange={(e) => setRdvDoctorId(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-required="true"
                      aria-label="Médecin traitant pour ce rendez-vous"
                    >
                      <option value="">-- Choisir un médecin --</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.prenom ? `${d.nom} ${d.prenom}` : d.nom}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500">
                      Le créneau est enregistré pour le praticien sélectionné.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Date de Naissance</Label>
                    <Input
                      type="date"
                      required
                      onChange={(e) => setNewPat({ ...newPat, date_naissance: e.target.value })}
                    />
                  </div>
                </Card>
              )}
            </div>

            {showDoctorFieldInSheet ? (
              <div className="space-y-2">
                <Label htmlFor="agenda-doctor">Médecin traitant</Label>
                <Select
                  required
                  value={sheetDoctorId || undefined}
                  onValueChange={setSheetDoctorId}
                >
                  <SelectTrigger id="agenda-doctor" className="w-full">
                    <SelectValue placeholder="-- Choisir un médecin --" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.prenom ? `${d.nom} ${d.prenom}` : d.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Motif de Consultation</Label>
              <Input
                required
                placeholder="Ex: Suivi, Urgence..."
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              />
            </div>

            <PlanifierUnCreneau
              value={appointmentType}
              onChange={setAppointmentType}
              bookingChannel={bookingChannel}
              onBookingChannelChange={setBookingChannel}
              initialPresence={initialPresence}
              onInitialPresenceChange={setInitialPresence}
            />

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Valider le Rendez-Vous
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingPublicAction !== null}
        onOpenChange={(open) => {
          if (!open && !pendingActionLoading) {
            setPendingPublicAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingPublicAction === 'validate' ? 'Valider la réservation ?' : 'Refuser la demande ?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingPublicAction === 'validate'
                ? 'Confirmez-vous la validation de cette réservation ? Le rendez-vous sera ajouté aux rendez-vous confirmés du cabinet.'
                : 'Confirmez-vous le refus de cette demande de rendez-vous ?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingActionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (!pendingPublicAction || pendingActionLoading) return;
                void performPublicAction(pendingPublicAction);
              }}
              disabled={pendingActionLoading}
            >
              {pendingActionLoading
                ? pendingPublicAction === 'validate'
                  ? 'Validation…'
                  : 'Refus…'
                : pendingPublicAction === 'validate'
                  ? 'Valider'
                  : 'Refuser la demande'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AgendaV2Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 h-[calc(100vh-120px)] animate-fade-in p-8 text-center text-slate-500">
          Chargement de l&apos;agenda…
        </div>
      }
    >
      <AgendaPageContent />
    </Suspense>
  );
}
