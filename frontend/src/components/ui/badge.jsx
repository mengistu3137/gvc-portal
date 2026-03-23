import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border border-slate-300 bg-slate-50 text-slate-700',
    accent: 'border border-accent/60 bg-accent/20 text-slate-900',
    primary: 'border border-primary/30 bg-primary/10 text-primary',
    success: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    destructive: 'border border-red-200 bg-red-50 text-red-700',
    outline: 'border border-primary/20 bg-white text-primary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
