import { cn } from '../../lib/utils';

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm text-slate-800 ring-offset-white transition-all duration-200 placeholder:text-slate-400',
        'hover:border-slate-300 hover:bg-slate-50',
        'focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-blue/10',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}
