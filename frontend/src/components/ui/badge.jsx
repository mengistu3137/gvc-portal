import { cn } from '../../lib/utils';

export function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'border border-slate-300 bg-slate-50 text-slate-700',
    accent: 'border border-accent/60 bg-accent/20 text-slate-900',
    primary: 'border border-primary/30 bg-primary/10 text-primary',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
