import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-brand-surface shadow-panel', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('border-b border-slate-200 px-4 py-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-sm font-semibold text-slate-900', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4', className)} {...props} />;
}
