'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CalendarClock, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  weeklyAvailabilitySchema,
  type WeeklyAvailability,
  defaultWeeklyAvailability,
  WEEKDAY_LABEL_MON_FIRST,
  type JsDayKey,
} from '@/lib/doctor-availability';
import { cn } from '@/lib/utils';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    throw new Error('Réponse invalide');
  }
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(typeof j.error === 'string' ? j.error : 'Erreur API');
  }
  return res.json() as Promise<{ weekly: WeeklyAvailability }>;
};

/**
 * Configuration des horaires hebdomadaires du praticien (persistés via `PUT /api/doctor/availability`).
 */
export function DoctorAvailabilityCard({ className }: { className?: string }) {
  const { data, error, isLoading, mutate } = useSWR('/api/doctor/availability', fetcher, {
    revalidateOnFocus: true,
  });

  const form = useForm<WeeklyAvailability>({
    resolver: zodResolver(weeklyAvailabilitySchema),
    defaultValues: defaultWeeklyAvailability(),
  });

  useEffect(() => {
    if (data?.weekly) {
      form.reset(data.weekly);
    }
  }, [data?.weekly, form]);

  const onSubmit = form.handleSubmit(async (weekly) => {
    try {
      const res = await fetch('/api/doctor/availability', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekly }),
      });
      const ct = res.headers.get('content-type') ?? '';
      const raw = await res.text();
      if (!ct.includes('application/json')) {
        toast.error('Réponse serveur invalide');
        return;
      }
      const j = JSON.parse(raw) as { error?: string; weekly?: WeeklyAvailability };
      if (!res.ok) {
        toast.error(j.error ?? 'Enregistrement refusé');
        return;
      }
      if (j.weekly) form.reset(j.weekly);
      await mutate();
      toast.success('Horaires enregistrés');
    } catch {
      toast.error('Impossible d’enregistrer');
    }
  });

  return (
    <Card className={cn('shadow-sm border-slate-200/60', className)}>
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-500" />
          Disponibilité & horaires
        </CardTitle>
        <CardDescription>
          Plages journalières (format 24 h). Les modifications sont enregistrées pour votre agenda.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {error ? (
          <p className="text-sm text-red-600">{String(error.message)}</p>
        ) : null}

        {isLoading && !data ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-3">
              {WEEKDAY_LABEL_MON_FIRST.map(({ key, label }) => {
                const k = key as JsDayKey;
                const enabled = form.watch(`${k}.enabled` as const);
                return (
                  <div
                    key={k}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) => form.setValue(`${k}.enabled`, v, { shouldDirty: true })}
                        id={`avail-${k}`}
                      />
                      <Label htmlFor={`avail-${k}`} className="text-sm font-medium text-slate-800">
                        {label}
                      </Label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">De</span>
                        <Input
                          type="time"
                          step={60}
                          disabled={!enabled}
                          className="w-[7.5rem] h-9"
                          {...form.register(`${k}.start`)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">à</span>
                        <Input
                          type="time"
                          step={60}
                          disabled={!enabled}
                          className="w-[7.5rem] h-9"
                          {...form.register(`${k}.end`)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {Object.keys(form.formState.errors).length > 0 ? (
              <p className="text-xs text-red-600">
                Vérifiez les heures (fin après début) sur les jours activés.
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting || isLoading}
              className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-sm sm:w-auto"
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer les horaires'
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
