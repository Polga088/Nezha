'use client';

import { useCallback } from 'react';
import {
  Calendar as RBCalendar,
  dateFnsLocalizer,
  type View,
  type EventPropGetter,
  type Formats,
} from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek as dateFnsStartOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale/fr';
import { Loader2 } from 'lucide-react';

const localizer = dateFnsLocalizer({
  format,
  parse,
  getDay,
  startOfWeek: dateFnsStartOfWeek,
  locales: { fr },
});

const AGENDA_MESSAGES = {
  date: 'Date',
  time: 'Heure',
  event: 'Rendez-vous',
  allDay: 'Journée',
  week: 'Semaine',
  work_week: 'Semaine ouvrée',
  day: 'Jour',
  month: 'Mois',
  previous: 'Précédent',
  next: 'Suivant',
  yesterday: 'Hier',
  tomorrow: 'Demain',
  today: 'Aujourd’hui',
  agenda: 'Liste',
  noEventsInRange: 'Aucun rendez-vous sur cette période.',
  showMore: (count: number, _remaining?: unknown[], _events?: unknown[]) =>
    `+${count} de plus`,
};

const AGENDA_FORMATS: Formats = {
  timeGutterFormat: 'HH:mm',
  agendaTimeFormat: 'HH:mm',
  eventTimeRangeFormat: (range, culture, loc) => {
    if (!loc) return '';
    return `${loc.format(range.start, 'HH:mm', culture)} – ${loc.format(range.end, 'HH:mm', culture)}`;
  },
  selectRangeFormat: (range, culture, loc) => {
    if (!loc) return '';
    return `${loc.format(range.start, 'HH:mm', culture)} – ${loc.format(range.end, 'HH:mm', culture)}`;
  },
  agendaTimeRangeFormat: (range, culture, loc) => {
    if (!loc) return '';
    return `${loc.format(range.start, 'HH:mm', culture)} – ${loc.format(range.end, 'HH:mm', culture)}`;
  },
  eventTimeRangeStartFormat: (range, culture, loc) => {
    if (!loc) return '';
    return `${loc.format(range.start, 'HH:mm', culture)} – `;
  },
  eventTimeRangeEndFormat: (range, culture, loc) => {
    if (!loc) return '';
    return ` – ${loc.format(range.end, 'HH:mm', culture)}`;
  },
};

const DnDCalendar = withDragAndDrop(RBCalendar);

export type AgendaCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  /** Couleur hex (ex. #38bdf8) — affichage barre agenda */
  color?: string | null;
};

type AgendaCalendarProps = {
  events: AgendaCalendarEvent[];
  date: Date;
  view: View;
  onNavigate: (d: Date) => void;
  onView: (v: View) => void;
  onEventDrop: (args: { event: AgendaCalendarEvent; start: Date; end: Date }) => void;
  onSelectSlot: (slot: { start: Date; end: Date }) => void;
  /** Revalidation SWR / rafraîchissement des données en cours */
  isRefreshing?: boolean;
  style?: React.CSSProperties;
};

/**
 * Agenda react-big-calendar + drag & drop — couleur par rendez-vous (`event.color`).
 */
export function Calendar({
  events,
  date,
  view,
  onNavigate,
  onView,
  onEventDrop,
  onSelectSlot,
  isRefreshing = false,
  style,
}: AgendaCalendarProps) {
  const eventPropGetter: EventPropGetter<AgendaCalendarEvent> = useCallback((event) => {
    const hex = (event.color && /^#[0-9A-Fa-f]{6}$/.test(event.color) ? event.color : '#7dd3fc').trim();
    return {
      style: {
        backgroundColor: `${hex}2e`,
        border: '1px solid rgb(241 245 249)',
        borderLeft: `3px solid ${hex}`,
        borderRadius: '0.5rem',
        color: '#1e293b',
        fontWeight: 600,
        fontSize: '12px',
        boxShadow: '0 1px 2px 0 rgb(15 23 42 / 0.04)',
      },
      className: 'nezha-cal-event',
    };
  }, []);

  return (
    <div className="relative h-full min-h-[420px] w-full">
      {isRefreshing ? (
        <div
          className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" aria-hidden />
          Synchronisation…
        </div>
      ) : null}
      <DnDCalendar
        localizer={localizer}
        culture="fr"
        messages={AGENDA_MESSAGES}
        formats={AGENDA_FORMATS}
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}
        events={events}
        onEventDrop={onEventDrop as never}
        onSelectSlot={onSelectSlot}
        selectable
        resizable={false}
        defaultView="week"
        step={30}
        timeslots={2}
        style={style ?? { height: '100%' }}
        eventPropGetter={eventPropGetter as never}
      />
    </div>
  );
}
