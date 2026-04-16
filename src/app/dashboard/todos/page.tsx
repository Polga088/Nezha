'use client';

import { TodoList } from '@/components/dashboard/TodoList';

export default function TodosPage() {
  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-10 pb-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
          Tâches
        </h1>
        <p className="text-sm text-slate-600">
          Liste personnelle — survolez une ligne pour modifier ou supprimer.
        </p>
      </header>

      <TodoList />
    </div>
  );
}
