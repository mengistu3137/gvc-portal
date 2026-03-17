import { cn } from '../../lib/utils';

export function Table({ className, ...props }) {
  return <table className={cn('w-full caption-bottom text-sm', className)} {...props} />;
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('bg-slate-50', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return <tr className={cn('border-b border-slate-200', className)} {...props} />;
}

export function TableHead({ className, ...props }) {
  return (
    <th
      className={cn(
        'h-9 px-3 text-left align-middle text-[11px] font-semibold uppercase tracking-wide text-slate-600',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }) {
  return <td className={cn('px-3 py-2 align-middle text-sm text-slate-800', className)} {...props} />;
}
