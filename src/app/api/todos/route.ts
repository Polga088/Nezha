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

const postSchema = z.object({
  task: z.string().min(1, 'La tâche est requise').max(10_000),
  /** ISO datetime ou `YYYY-MM-DD` (champ date HTML). */
  dueDate: z.union([z.string(), z.null()]).optional(),
});

function parseDueDate(raw: string | null | undefined): Date | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** GET — tâches de l'utilisateur connecté, triées par date d'échéance. */
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const userId = String(user.id);
    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { dueDate: 'asc' },
    });
    return NextResponse.json(todos);
  } catch (e) {
    console.error('[GET /api/todos]', e);
    return NextResponse.json({ error: 'Erreur lors du chargement des tâches' }, { status: 500 });
  }
}

/** POST — crée une tâche liée à l'utilisateur authentifié. */
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  try {
    const raw = await request.json();
    const parsed = postSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors.task?.[0] ?? 'Données invalides';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { task, dueDate } = parsed.data;
    let due: Date | null = null;
    if (dueDate !== undefined && dueDate !== null) {
      due = parseDueDate(dueDate);
      if (due === null && String(dueDate).trim() !== '') {
        return NextResponse.json({ error: 'Date d’échéance invalide' }, { status: 400 });
      }
    }

    const todo = await prisma.todo.create({
      data: {
        userId: String(user.id),
        task: task.trim(),
        dueDate: due,
      },
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (e) {
    console.error('[POST /api/todos]', e);
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}
