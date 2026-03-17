import { cn } from '../../lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
        className
      )}
      {...props}
    />
  );
}
