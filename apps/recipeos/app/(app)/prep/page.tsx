'use client';

import { usePrepLists, useTogglePrepTask } from '@/lib/queries/prep';

export default function PrepPage() {
  const { data: lists, isLoading, error } = usePrepLists();
  const toggleTask = useTogglePrepTask();

  if (isLoading) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Prep List</h1>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-gray-100 animate-pulse" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Prep List</h1>
      <p className="text-red-500">Failed to load prep lists. Please refresh.</p>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Prep List</h1>

      {!lists || lists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-semibold">No prep lists yet</h2>
          <p className="mt-2 text-sm text-gray-500">Prep lists will appear here once created.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {lists.map((list) => (
            <div key={list.id} className="rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold mb-3">{list.name}</h2>
              {!list.tasks || list.tasks.length === 0 ? (
                <p className="text-sm text-gray-400">No tasks.</p>
              ) : (
                <ul className="space-y-2">
                  {list.tasks.sort((a, b) => a.sort_order - b.sort_order).map((task) => (
                    <li key={task.id} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={task.is_done}
                        onChange={() => toggleTask.mutate({ id: task.id, is_done: !task.is_done })}
                        className="w-4 h-4 rounded"
                      />
                      <span className={`text-sm ${task.is_done ? 'line-through text-gray-400' : ''}`}>
                        {task.task}
                      </span>
                      {task.estimated_minutes && (
                        <span className="ml-auto text-xs text-gray-400">{task.estimated_minutes}m</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 text-xs text-gray-400">
                {list.tasks?.filter(t => t.is_done).length ?? 0} / {list.tasks?.length ?? 0} done
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
