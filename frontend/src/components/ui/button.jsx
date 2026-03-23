import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  accent: 'bg-accent text-slate-900 hover:bg-accent/90',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
};

const sizes = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-xs',
};

export function Button({
  className,
  variant = 'default',
  size = 'md',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
