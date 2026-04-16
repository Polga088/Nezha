'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, GripVertical, Loader2, MoreHorizontal, Phone, Users } from 'lucide-react';
import { differenceInMilliseconds } from 'date-fns';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { buildWaitingQueueQuery, getTodayRange } from '@/lib/appointments-range';
import { cn } from '@/lib/utils';
import { BOOKING_CHANNEL_LABEL } from '@/lib/booking-channel';

export type QueueAppointment = {
  id: string;
  date_heure: string;
  motif: string;
  statut: string;
  appointmentType?: 'URGENT' | 'FIRST_VISIT' | 'FOLLOW_UP' | null;
  bookingChannel?: 'PHONE' | 'ON_SITE' | null;
  arrivalTime: string | null;
  waitingRoomOrder: number;
  patient: { nom: string; prenom: string; tel: string | null };
  doctor: { nom: string };
};

async function queueFetcher(url: string): Promise<QueueAppointment[]> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function formatWait(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

function typeBadge(t: QueueAppointment['appointmentType']): { label: string; className: string } {
  switch (t) {
    case 'URGENT':
      return { label: 'Urgence', className: 'bg-red-100 text-red-800 border-red-200' };
    case 'FIRST_VISIT':
      return { label: '1ʳᵉ visite', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'FOLLOW_UP':
    default:
      return { label: 'Suivi', className: 'bg-blue-100 text-blue-800 border-blue-200' };
  }
}

function waitColorClass(minutes: number): string {
  if (minutes < 10) {
    return 'border border-outline-variant/15 bg-emerald-50 text-emerald-800';
  }
  if (minutes < 20) {
    return 'border border-outline-variant/15 bg-amber-50 text-amber-800';
  }
  return 'border border-outline-variant/15 bg-red-50 text-red-800';
}

function useWaitMs(arrivalTime: string | null, dateHeure: string, now: Date): number {
  return useMemo(() => {
    const start = new Date(arrivalTime ?? dateHeure);
    return Math.max(0, differenceInMilliseconds(now, start));
  }, [arrivalTime, dateHeure, now]);
}

function SortableRow({
  appt,
  now,
  onRequestCancel,
  dragDisabled,
}: {
  appt: QueueAppointment;
  now: Date;
  onRequestCancel: (appt: QueueAppointment) => void;
  dragDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: appt.id,
    disabled: dragDisabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const ms = useWaitMs(appt.arrivalTime, appt.date_heure, now);
  const minutes = Math.floor(ms / 60000);
  const colorCls = waitColorClass(minutes);
  const badge = typeBadge(appt.appointmentType ?? 'FOLLOW_UP');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-stretch gap-2 rounded-xl border border-outline-variant/15 bg-container-lowest p-3 shadow-medical',
        isDragging && 'z-10 opacity-70 shadow-lg'
      )}
    >
      {dragDisabled ? (
        <span
          className="flex w-7 shrink-0 items-center justify-center text-on-surface-variant/40"
          title="Réordonnancement disponible sur « Tous les médecins »"
          aria-hidden
        >
          <GripVertical className="h-5 w-5" />
        </span>
      ) : (
        <button
          type="button"
          className="flex cursor-grab touch-none items-center rounded-lg px-1 text-on-surface-variant hover:bg-container-low hover:text-on-surface active:cursor-grabbing"
          aria-label="Réordonner"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-container-low text-on-surface-variant"
            title={
              appt.bookingChannel === 'ON_SITE'
                ? BOOKING_CHANNEL_LABEL.ON_SITE
                : BOOKING_CHANNEL_LABEL.PHONE
            }
          >
            {appt.bookingChannel === 'ON_SITE' ? (
              <Building2 className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Phone className="h-3.5 w-3.5" aria-hidden />
            )}
          </span>
          <p className="truncate font-semibold tracking-tight text-on-surface">
            {appt.patient.prenom} {appt.patient.nom}
          </p>
          <span
            className={cn(
              'shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              badge.className
            )}
          >
            {badge.label}
          </span>
        </div>
        <p className="line-clamp-2 text-xs text-on-surface-variant">{appt.motif}</p>
        <p className="mt-1 text-[11px] text-on-surface-variant/90">
          {appt.doctor?.nom?.startsWith('Dr') ? appt.doctor.nom : `Dr. ${appt.doctor?.nom ?? '—'}`}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 self-center">
        <div
          className={cn(
            'rounded-lg border px-2.5 py-1 text-xs font-bold tabular-nums',
            colorCls
          )}
          title="Temps écoulé depuis l’arrivée en salle ou l’heure du RDV"
        >
          {formatWait(ms)}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg border border-transparent text-on-surface-variant hover:border-outline-variant/15 hover:bg-container-low hover:text-on-surface"
              aria-label="Options du rendez-vous"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="min-w-[11rem] border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical"
          >
            <DropdownMenuItem
              className="text-red-600 focus:bg-red-50 focus:text-red-600"
              onSelect={() => onRequestCancel(appt)}
            >
              Annuler le RDV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

const QUEUE_FILTER_ALL = '__ALL__';

type DoctorOption = { id: string; nom: string; prenom: string };

/**
 * File d’attente du jour — RDV `WAITING`, tous les médecins ou filtre par praticien ; ordre réorganisable (dnd-kit) sur la vue « tous ».
 */
export function QueueManager() {
  const [items, setItems] = useState<QueueAppointment[]>([]);
  const [clock, setClock] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<QueueAppointment | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  /** Vide = tous les médecins */
  const [filterDoctorId, setFilterDoctorId] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/doctors', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.resolve([])))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data)) setDoctors(data as DoctorOption[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const queueUrl = useMemo(() => {
    const q = buildWaitingQueueQuery(getTodayRange(clock), {
      doctorId: filterDoctorId || undefined,
    });
    return `/api/appointments?${q}`;
  }, [clock, filterDoctorId]);

  const dragDisabled = Boolean(filterDoctorId);

  const { data, isLoading, mutate } = useSWR<QueueAppointment[]>(queueUrl, queueFetcher, {
    revalidateOnFocus: true,
    refreshInterval: 20_000,
  });

  useEffect(() => {
    if (Array.isArray(data)) setItems(data);
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    if (dragDisabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setSaving(true);
    try {
      const res = await fetch('/api/appointments/waiting-room/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next.map((x) => x.id) }),
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j?.error === 'string' ? j.error : 'Ordre non enregistré');
        setItems(previous);
      }
    } catch {
      toast.error('Erreur réseau');
      setItems(previous);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCancel = useCallback(async () => {
    if (!pendingCancel) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/appointments/${pendingCancel.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Annulation impossible');
        return;
      }
      toast.success('Rendez-vous annulé');
      setPendingCancel(null);
      await mutate();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setCancelLoading(false);
    }
  }, [pendingCancel, mutate]);

  const showInitialLoad = isLoading && data === undefined;

  return (
    <>
      <Card className="border-0 bg-container-lowest shadow-medical">
        <CardHeader className="border-b border-outline-variant/15 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-on-surface">
                <Users className="h-5 w-5 text-primary" />
                File d&apos;attente
              </CardTitle>
              <CardDescription className="text-on-surface-variant">
                {filterDoctorId
                  ? 'RDV en attente pour le médecin sélectionné. Réordonnancement disponible sur « Tous les médecins ».'
                  : 'Tous les RDV du jour en attente — glisser pour réordonner. Délais : vert / orange / rouge.'}
              </CardDescription>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-64">
              <Label htmlFor="queue-filter-doctor" className="text-on-surface">
                Filtrer par médecin
              </Label>
              <Select
                value={filterDoctorId ? filterDoctorId : QUEUE_FILTER_ALL}
                onValueChange={(v) => setFilterDoctorId(v === QUEUE_FILTER_ALL ? '' : v)}
              >
                <SelectTrigger id="queue-filter-doctor" className="w-full border-outline-variant/15 bg-container-lowest">
                  <SelectValue placeholder="Tous les médecins" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={QUEUE_FILTER_ALL}>Tous les médecins</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.prenom ? `${d.nom} ${d.prenom}` : d.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {saving ? (
              <span className="flex shrink-0 items-center gap-1 self-center text-xs text-on-surface-variant sm:self-start">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Enregistrement…
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          {showInitialLoad ? (
            <div className="flex justify-center py-10 text-sm text-on-surface-variant">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-outline-variant/20 py-8 text-center text-sm text-on-surface-variant">
              Aucun rendez-vous en attente pour aujourd&apos;hui.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-3">
                  {items.map((appt) => (
                    <li key={appt.id}>
                      <SortableRow
                        appt={appt}
                        now={clock}
                        onRequestCancel={setPendingCancel}
                        dragDisabled={dragDisabled}
                      />
                    </li>
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingCancel}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null);
        }}
      >
        <AlertDialogContent className="border-outline-variant/15 bg-container-lowest text-on-surface shadow-medical sm:rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-on-surface">Annuler ce rendez-vous ?</AlertDialogTitle>
            <AlertDialogDescription className="text-on-surface-variant">
              {pendingCancel ? (
                <>
                  Le rendez-vous de{' '}
                  <span className="font-medium text-on-surface">
                    {pendingCancel.patient.prenom} {pendingCancel.patient.nom}
                  </span>{' '}
                  sera marqué comme annulé. Cette action est visible dans l&apos;historique.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelLoading} className="border-outline-variant/20">
              Retour
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelLoading}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
              onClick={() => void handleConfirmCancel()}
            >
              {cancelLoading ? 'Annulation…' : 'Confirmer l’annulation'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
