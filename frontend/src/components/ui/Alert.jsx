export function Alert({ title, children, tone = 'warning' }) {
  const tones = {
    warning: 'border-amber-300 bg-amber-50 text-amber-900',
    danger: 'border-red-300 bg-red-50 text-red-900',
    success: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  };

  return (
    <div className={`rounded-md border p-3 ${tones[tone] || tones.warning}`}>
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
