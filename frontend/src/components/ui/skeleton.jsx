import { cn } from '../../lib/utils';

export function Skeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-slate-200/80', className)}>
      <div className="absolute inset-y-0 w-1/2 animate-[skeleton-shimmer_1.2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
  );
}
