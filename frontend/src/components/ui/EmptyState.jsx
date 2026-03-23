import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'No records found', description = 'Try adjusting filters or creating a new item.' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
      <div className="mb-2 rounded-full bg-slate-100 p-2 text-primary">
        <Inbox size={18} />
      </div>
      <h4 className="text-sm font-medium text-slate-900">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>
    </div>
  );
}
