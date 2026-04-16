'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, ListTodo, Loader2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const TODOS_KEY = '/api/todos';

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('fetch failed');
  return res.json();
};

export type TodoRow = {
  id: string;
  userId: string;
  task: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
};

/** Rappel : tâche non faite, avec échéance strictement dans le passé. */
const isReminderAlert = (todo: TodoRow) =>
  !todo.completed &&
  !!todo.dueDate &&
  new Date(todo.dueDate) < new Date();

/**
 * Liste de tâches — édition en ligne, suppression avec confirmation.
 */
export const TodoList = () => {
  const { data, isLoading, error, mutate } = useSWR<TodoRow[]>(TODOS_KEY, fetcher, {
    revalidateOnFocus: true,
  });

  const [task, setTask] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editDue, setEditDue] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<TodoRow | null>(null);

  const todos = Array.isArray(data) ? data : [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = task.trim();
    if (!t) {
      toast.error('Indiquez une description de tâche');
      return;
    }
    setSubmitting(true);
    try {
      const body: { task: string; dueDate?: string | null } = { task: t };
      if (dueDate.trim()) body.dueDate = dueDate.trim();
      const res = await fetch(TODOS_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Création impossible');
        return;
      }
      setTask('');
      setDueDate('');
      await mutate();
      toast.success('Tâche ajoutée');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (row: TodoRow) => {
    setTogglingId(row.id);
    try {
      const res = await fetch(`/api/todos/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ completed: !row.completed }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Mise à jour impossible');
        return;
      }
      await mutate();
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setTogglingId(null);
    }
  };

  const handleStartEdit = (row: TodoRow) => {
    setEditingId(row.id);
    setEditTask(row.task);
    setEditDue(row.dueDate ? format(new Date(row.dueDate), 'yyyy-MM-dd') : '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTask('');
    setEditDue('');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const t = editTask.trim();
    if (!t) {
      toast.error('Indiquez une description de tâche');
      return;
    }
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/todos/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          task: t,
          dueDate: editDue.trim() ? editDue.trim() : null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(typeof j.error === 'string' ? j.error : 'Enregistrement impossible');
        return;
      }
      handleCancelEdit();
      await mutate();
      toast.success('Tâche mise à jour');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const row = pendingDelete;
    setDeletingId(row.id);
    try {
      const res = await fetch(`/api/todos/${row.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok && res.status !== 204) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(typeof j.error === 'string' ? j.error : 'Suppression impossible');
        return;
      }
      setPendingDelete(null);
      await mutate();
      toast.success('Tâche supprimée');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-sky-100/80 bg-white shadow-sm">
        <CardHeader className="border-b border-sky-100/60 bg-sky-50/30 px-5 py-4 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <ListTodo className="h-5 w-5 shrink-0 text-sky-600" aria-hidden />
            Mes tâches
          </CardTitle>
          <CardDescription className="text-slate-600">
            Ajoutez une tâche et une échéance ; les retards sont mis en évidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 bg-white px-5 py-5 sm:px-6">
          <form
            onSubmit={(e) => void handleAdd(e)}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="todo-task" className="text-xs font-medium text-slate-600">
                Tâche
              </Label>
              <Input
                id="todo-task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Ex. Relire le dossier…"
                autoComplete="off"
                className="border-slate-200 bg-white"
              />
            </div>
            <div className="w-full space-y-1.5 sm:w-44">
              <Label htmlFor="todo-due" className="text-xs font-medium text-slate-600">
                Échéance
              </Label>
              <Input
                id="todo-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-slate-200 bg-white"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-10 shrink-0 bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-sm sm:mb-0.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Ajout…
                </>
              ) : (
                'Ajouter'
              )}
            </Button>
          </form>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Liste</p>
            {error ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-800">
                Impossible de charger les tâches. Vérifiez votre connexion ou reconnectez-vous.
              </p>
            ) : isLoading ? (
              <p className="py-6 text-center text-sm text-slate-500">Chargement…</p>
            ) : todos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-500">
                Aucune tâche pour le moment.
              </p>
            ) : (
              <ul className="max-h-[min(52vh,420px)] space-y-2 overflow-y-auto pr-1">
                {todos.map((row) => {
                  const alert = isReminderAlert(row);
                  const busy = deletingId === row.id || togglingId === row.id;
                  const isEditing = editingId === row.id;
                  return (
                    <li
                      key={row.id}
                      className={cn(
                        'group relative rounded-2xl border p-3 transition-colors sm:gap-3',
                        row.completed
                          ? 'border-slate-200/80 bg-slate-50/60 opacity-90'
                          : alert
                            ? 'border-amber-200/90 bg-amber-50/40'
                            : 'border-slate-200/80 bg-white'
                      )}
                    >
                      {isEditing ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                          <div className="min-w-0 flex-1 space-y-2">
                            <Label className="text-xs text-slate-600" htmlFor={`edit-task-${row.id}`}>
                              Tâche
                            </Label>
                            <Input
                              id={`edit-task-${row.id}`}
                              value={editTask}
                              onChange={(e) => setEditTask(e.target.value)}
                              autoComplete="off"
                              className="border-slate-200"
                            />
                          </div>
                          <div className="w-full space-y-2 sm:w-40">
                            <Label className="text-xs text-slate-600" htmlFor={`edit-due-${row.id}`}>
                              Échéance
                            </Label>
                            <Input
                              id={`edit-due-${row.id}`}
                              type="date"
                              value={editDue}
                              onChange={(e) => setEditDue(e.target.value)}
                              className="border-slate-200"
                            />
                          </div>
                          <div className="flex shrink-0 gap-2 sm:pb-0.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={savingEdit}
                              onClick={handleCancelEdit}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-gradient-to-b from-sky-500 to-sky-600"
                              disabled={savingEdit}
                              onClick={() => void handleSaveEdit()}
                            >
                              {savingEdit ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                'Enregistrer'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className="shrink-0 pt-0.5">
                            <input
                              type="checkbox"
                              checked={row.completed}
                              disabled={busy}
                              onChange={() => void handleToggle(row)}
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              aria-label={
                                row.completed ? 'Marquer comme non fait' : 'Marquer comme fait'
                              }
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              {alert ? (
                                <span className="mt-0.5 shrink-0" aria-hidden>
                                  <AlertTriangle
                                    className="h-4 w-4 text-amber-600 motion-safe:animate-pulse"
                                    strokeWidth={2.25}
                                  />
                                </span>
                              ) : null}
                              <p
                                className={cn(
                                  'min-w-0 flex-1 text-sm leading-snug text-slate-900',
                                  row.completed && 'text-slate-500 line-through'
                                )}
                              >
                                {row.task}
                              </p>
                            </div>
                            {row.dueDate ? (
                              <p
                                className={cn(
                                  'mt-1.5 text-xs',
                                  alert ? 'font-medium text-amber-900' : 'text-slate-500'
                                )}
                              >
                                Échéance :{' '}
                                {format(new Date(row.dueDate), 'd MMMM yyyy', { locale: fr })}
                                {alert ? (
                                  <span className="font-semibold text-amber-800"> — en retard</span>
                                ) : null}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 self-start pt-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-9 gap-1.5 px-2 text-slate-500 hover:bg-sky-50 hover:text-slate-900"
                              disabled={busy}
                              onClick={() => handleStartEdit(row)}
                              aria-label="Éditer la tâche"
                            >
                              <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                              <span className="text-xs font-medium">Éditer</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                              disabled={busy}
                              onClick={() => setPendingDelete(row)}
                              aria-label="Supprimer la tâche"
                            >
                              {deletingId === row.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border-slate-200 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette tâche ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? (
                <>
                  « {pendingDelete.task.slice(0, 120)}
                  {pendingDelete.task.length > 120 ? '…' : ''} » sera définitivement retiré de la
                  liste.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId != null}>Annuler</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingId != null}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={() => void handleConfirmDelete()}
            >
              {deletingId != null ? 'Suppression…' : 'Supprimer'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
