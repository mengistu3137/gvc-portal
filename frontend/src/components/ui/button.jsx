import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-primary text-white hover:bg-primary/90 shadow-sm',
  outline: 'border border-primary/20 bg-white text-primary hover:border-primary/35 hover:bg-primary/5',
  ghost: 'text-primary hover:bg-primary/10',
  accent: 'bg-accent text-slate-900 hover:bg-accent/90',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
};

const sizes = {
  sm: 'h-7 px-2.5 text-[11px]',
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
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
