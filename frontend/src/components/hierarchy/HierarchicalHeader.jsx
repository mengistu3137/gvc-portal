import { ChevronRight } from 'lucide-react';

export function HierarchicalHeader({ items = [] }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-panel">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        Academic Context
      </div>
      <div className="flex flex-wrap items-center gap-1 text-xs uppercase tracking-wide">
        {items.map((item, index) => {
          const isActive = index === items.length - 1;

          return (
            <div key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight size={12} className="text-primary/50" /> : null}
              <button
                type="button"
                onClick={() => item.onClick?.(item)}
                className={[
                  'relative text-primary transition-colors',
                  isActive ? 'font-semibold' : 'hover:text-primary/80',
                ].join(' ')}
              >
                {item.label}
                {isActive ? <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-accent" /> : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
