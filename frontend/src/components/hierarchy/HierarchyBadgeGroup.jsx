import { Dot } from 'lucide-react';
import { Badge } from '../ui/badge';

export function HierarchyBadgeGroup({ sectorAbbr, occCode, level, batchCode }) {
  return (
    <div className="flex items-center gap-1 text-[11px]">
      <Badge>{sectorAbbr}</Badge>
      <span className="text-slate-300">&gt;</span>
      <Badge>{occCode}</Badge>
      <span className="text-slate-300">&gt;</span>
      <Badge>{level}</Badge>
      <span className="inline-flex items-center rounded-md border border-primary/30 bg-slate-100 px-1.5 py-0.5 font-medium text-primary">
        <Dot size={14} className="-mx-1 text-accent" />
        {batchCode}
      </span>
    </div>
  );
}
