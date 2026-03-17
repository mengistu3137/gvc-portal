import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-primary/15 bg-brand-surface shadow-panel', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('border-b border-primary/15 px-3 py-2.5', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-xs font-extrabold uppercase tracking-wide text-brand-ink', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-3', className)} {...props} />;
}
