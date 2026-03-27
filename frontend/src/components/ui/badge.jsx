import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border border-slate-200 bg-slate-50 text-slate-600',
    accent: 'border border-amber-200 bg-amber-50 text-amber-700',
    primary: 'border border-brand-blue/30 bg-brand-blue/10 text-brand-blue',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100',
    destructive: 'border border-rose-200 bg-rose-50 text-rose-700',
    outline: 'border-2 border-slate-100 bg-white text-slate-500',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
