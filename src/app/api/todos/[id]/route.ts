import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { verifyJwt } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function getUser(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) return null;
  return verifyJwt(token);
}

const patchSchema = z
  .object({
    completed: z.boolean().optional(),
    task: z.string().min(1).max(100000).optional(),
    dueDate: z.union([z.string(), z.null()]).optional(),
  })
  .refine(
    (d) =>
      d.completed !== undefined || d.task !== undefined || d.dueDate !== undefined,
    { message: 'Aucun champ à mettre à jour' }
  );

/** PATCH — cocher / texte / échéance (propriétaire uniquement). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const userId = String(user.id);

  try {
    const raw = await request.json();
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().formErrors[0] ?? 'Corps invalide' },
        { status: 400 }
      );
    }

    const existing = await prisma.todo.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
    }

    const { completed, task, dueDate } = parsed.data;
    const data: {
      completed?: boolean;
      task?: string;
      dueDate?: Date | null;
    } = {};
    if (completed !== undefined) data.completed = completed;
    if (task !== undefined) data.task = task.trim();
    if (dueDate !== undefined) {
      if (dueDate === null || dueDate === '') {
        data.dueDate = null;
      } else {
        const s = dueDate.trim();
        const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
          ? new Date(`${s}T12:00:00`)
          : new Date(s);
        if (!Number.isFinite(d.getTime())) {
          return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
        }
        data.dueDate = d;
      }
    }

    const todo = await prisma.todo.update({
      where: { id },
      data,
    });
    return NextResponse.json(todo);
  } catch (e) {
    console.error('[PATCH /api/todos/:id]', e);
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
  }
}

/** DELETE — supprimer une tâche (propriétaire uniquement). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(_request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const userId = String(user.id);

  try {
    const removed = await prisma.todo.deleteMany({
      where: { id, userId },
    });
    if (removed.count === 0) {
      return NextResponse.json({ error: 'Tâche introuvable' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error('[DELETE /api/todos/:id]', e);
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}
