import { cn } from '../../lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-8 w-full rounded-md border border-primary/20 bg-white px-2.5 text-xs text-brand-ink placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35',
        className
      )}
      {...props}
    />
  );
}
