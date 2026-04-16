'use client';

import { Suspense, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { View } from 'react-big-calendar';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { toast } from 'sonner';
import useSWR from 'swr';

import {
  Calendar as AgendaCalendar,
  type AgendaCalendarEvent,
} from '@/components/agenda/Calendar';
import { PlanifierUnCreneau, type InitialPresence } from '@/components/agenda/PlanifierUnCreneau';
import type { AppointmentType, BookingChannel } from '@/generated/prisma/client';
import { colorForAppointmentType } from '@/lib/appointment-types';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

import { getVisibleRange, buildAppointmentsQuery } from '@/lib/appointments-range';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-override.css';

const FILTER_ALL_VALUE = '__ALL__';

type PatientOption = { id: string; nom: string; prenom: string };

type AppointmentApiRow = {
  id: string;
  motif: string;
  date_heure: string;
  color?: string | null;
  appointmentType: AppointmentType;
  patient?: { nom?: string | null } | null;
};

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

  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreatePatientMode, setIsCreatePatientMode] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
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

  const events: AgendaCalendarEvent[] = useMemo(() => {
    if (!Array.isArray(appointmentsRaw)) return [];
    return (appointmentsRaw as AppointmentApiRow[]).map((a) => ({
      id: a.id,
      title: `${a.patient?.nom ?? '?'} - ${a.motif}`,
      start: new Date(a.date_heure),
      end: new Date(new Date(a.date_heure).getTime() + 30 * 60000),
      color: a.color ?? colorForAppointmentType(a.appointmentType),
    }));
  }, [appointmentsRaw]);

  const fetchPatientsList = async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) setPatients(await res.json());
    } catch (e) {
      console.error('[Agenda] fetchPatientsList', e);
    }
  };

  useEffect(() => {
    fetchPatientsList();
  }, []);

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
    setSelectedSlot(slotInfo);
    setRdvDoctorId((prev) => (prev.trim() ? prev : agendaFilterDoctorId));
    setIsSheetOpen(true);
  };

  const handleNavigate = useCallback((newDate: Date) => {
    setCalendarDate(newDate);
  }, []);

  const handleViewChange = useCallback((nextView: View) => {
    setCalendarView(nextView);
  }, []);

  const showDoctorFieldInSheet =
    needsDoctorSelect && userRole === 'ADMIN' && !agendaFilterDoctorId;

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

      const wasNewPatient = isCreatePatientMode;
      await mutate();
      toast.success('Rendez-vous planifié avec succès !', {
        description: 'L’agenda a été synchronisé.',
      });
      setIsSheetOpen(false);
      setIsCreatePatientMode(false);
      setMotif('');
      setAppointmentType('FOLLOW_UP');
      setBookingChannel('PHONE');
      setInitialPresence('confirmed');
      setSelectedPatientId('');
      setPrefillTelDisplay('');
      setSheetDoctorId('');
      setRdvDoctorId('');
      if (wasNewPatient) fetchPatientsList();
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
    setSelectedSlot({ start, end });
    setRdvDoctorId((prev) => (prev.trim() ? prev : agendaFilterDoctorId));
    setIsSheetOpen(true);
  };

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
          isRefreshing={isCalendarRefreshing}
          style={{ height: '100%' }}
        />
      </Card>

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) {
            setSheetDoctorId('');
            setRdvDoctorId('');
          }
        }}
      >
        <SheetContent className="bg-white overflow-y-auto">
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
            ) : null}

            <div className="space-y-4">
              {!isCreatePatientMode ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="agenda-patient">Associer un Patient Existant</Label>
                    <input type="hidden" name="patient_id" value={selectedPatientId} readOnly />
                    <Select
                      value={selectedPatientId || undefined}
                      onValueChange={setSelectedPatientId}
                    >
                      <SelectTrigger id="agenda-patient" className="w-full">
                        <SelectValue placeholder="-- Rechercher dans le DME --" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nom.toUpperCase()} {p.prenom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {prefillTelDisplay ? (
                      <p className="text-xs text-slate-600 rounded-md bg-slate-50 border border-slate-100 px-3 py-2">
                        <span className="font-medium text-slate-700">Téléphone (dossier) :</span>{' '}
                        {prefillTelDisplay}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-slate-200 flex-1"></div>
                    <span className="text-xs text-slate-400">Ou</span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setIsCreatePatientMode(true)}
                  >
                    Nouveau Patient
                  </Button>
                </>
              ) : (
                <Card className="p-4 space-y-4 bg-slate-50/50 border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-slate-800">Création Fiche</span>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 text-xs text-red-600"
                      onClick={() => setIsCreatePatientMode(false)}
                    >
                      Annuler
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      required
                      onChange={(e) => setNewPat({ ...newPat, nom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input
                      required
                      onChange={(e) => setNewPat({ ...newPat, prenom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      onChange={(e) => setNewPat({ ...newPat, tel: e.target.value })}
                    />
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
