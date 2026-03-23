import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function Node({ node, depth, activeId, onSelect }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isActive = node.id === activeId;

  return (
    <div className="text-xs">
      <button
        type="button"
        onClick={() => {
          if (hasChildren) {
            setOpen((value) => !value);
          }
          onSelect?.(node);
        }}
        className={[
          'flex w-full items-center gap-1 rounded px-2 py-1.5 text-left',
          isActive ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100',
        ].join(' ')}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ?
          open ? <ChevronDown size={13} className="text-primary" /> : <ChevronRight size={13} className="text-primary" />
        : <span className="w-[13px]" />}
        <span className="truncate">{node.label}</span>
      </button>

      {hasChildren && open ? (
        <div className="ml-3 border-l border-slate-200">
          {node.children.map((child) => (
            <Node
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function NestedTreeExplorer({ nodes = [], activeId, onSelect }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/40 p-2">
      {nodes.map((node) => (
        <Node key={node.id} node={node} depth={0} activeId={activeId} onSelect={onSelect} />
      ))}
    </div>
  );
}
