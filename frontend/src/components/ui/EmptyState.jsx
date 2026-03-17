import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'No records found', description = 'Try adjusting filters or creating a new item.' }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <div className="mb-3 rounded-full bg-accent/30 p-2 text-primary">
        <Inbox size={18} />
      </div>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>
    </div>
  );
}
