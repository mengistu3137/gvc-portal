import { cn } from '../../lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-md border border-slate-200 bg-white shadow-panel', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn('border-b border-slate-200 px-3 py-2', className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('text-sm font-semibold text-slate-900', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-3', className)} {...props} />;
}
