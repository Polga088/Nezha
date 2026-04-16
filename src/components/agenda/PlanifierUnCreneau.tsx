'use client';

import type { AppointmentType, BookingChannel } from '@/generated/prisma/client';
import { Building2, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { colorForAppointmentType } from '@/lib/appointment-types';
import { BOOKING_CHANNEL_LABEL } from '@/lib/booking-channel';

const RDV_TYPE_OPTIONS: Array<{
  type: AppointmentType;
  label: string;
  description: string;
}> = [
  {
    type: 'URGENT',
    label: 'Urgence',
    description:
      'Situation nécessitant une prise en charge prioritaire (douleur aiguë, aggravation, etc.).',
  },
  {
    type: 'FIRST_VISIT',
    label: 'Première consultation',
    description: 'Première venue du patient au cabinet ou nouvelle pathologie à explorer.',
  },
  {
    type: 'FOLLOW_UP',
    label: 'Suivi',
    description: 'Contrôle, renouvellement de traitement ou rendez-vous de routine.',
  },
];

export type InitialPresence = 'confirmed' | 'in_room';

type PlanifierUnCreneauProps = {
  value: AppointmentType;
  onChange: (next: AppointmentType) => void;
  bookingChannel: BookingChannel;
  onBookingChannelChange: (next: BookingChannel) => void;
  initialPresence: InitialPresence;
  onInitialPresenceChange: (next: InitialPresence) => void;
  className?: string;
};

/**
 * Réservation : type de RDV + canal (téléphone / sur place) + présence initiale (confirmé / en salle).
 */
export function PlanifierUnCreneau({
  value,
  onChange,
  bookingChannel,
  onBookingChannelChange,
  initialPresence,
  onInitialPresenceChange,
  className,
}: PlanifierUnCreneauProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <p className="text-sm font-medium text-on-surface">Canal de réservation</p>
        <div
          className="grid grid-cols-2 gap-2 rounded-xl bg-container-low p-1"
          role="group"
          aria-label="Canal de réservation"
        >
          {(['PHONE', 'ON_SITE'] as const).map((ch) => {
            const selected = bookingChannel === ch;
            return (
              <button
                key={ch}
                type="button"
                onClick={() => onBookingChannelChange(ch)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  selected
                    ? 'bg-container-lowest text-primary shadow-medical'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {ch === 'PHONE' ? (
                  <Phone className="h-4 w-4 shrink-0" aria-hidden />
                ) : (
                  <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {BOOKING_CHANNEL_LABEL[ch]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-on-surface">Présence du patient</p>
        <div
          className="grid grid-cols-2 gap-2 rounded-xl bg-container-low p-1"
          role="group"
          aria-label="Statut initial du patient"
        >
          <button
            type="button"
            onClick={() => onInitialPresenceChange('confirmed')}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              initialPresence === 'confirmed'
                ? 'bg-container-lowest text-primary shadow-medical'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            Confirmé
          </button>
          <button
            type="button"
            onClick={() => onInitialPresenceChange('in_room')}
            className={cn(
              'rounded-lg px-3 py-2.5 text-sm font-semibold transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              initialPresence === 'in_room'
                ? 'bg-container-lowest text-primary shadow-medical'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            En salle d&apos;attente
          </button>
        </div>
        <p className="text-xs text-on-surface-variant">
          « En salle » enregistre l&apos;heure d&apos;arrivée tout de suite ; la file d&apos;attente
          active en tient compte.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-on-surface">Type de rendez-vous</p>
        <div className="flex flex-col gap-3">
          {RDV_TYPE_OPTIONS.map((opt) => {
            const selected = value === opt.type;
            const dot = colorForAppointmentType(opt.type);
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onChange(opt.type)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  'hover:border-outline-variant/40 hover:bg-container-low/80',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  selected
                    ? 'border-primary/40 bg-container-lowest shadow-medical ring-1 ring-primary/20'
                    : 'border-outline-variant/15 bg-container-lowest'
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: dot }}
                    aria-hidden
                  />
                  <span className="font-semibold text-on-surface">{opt.label}</span>
                </div>
                <p className="mt-2 pl-7 text-xs leading-relaxed text-on-surface-variant">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
