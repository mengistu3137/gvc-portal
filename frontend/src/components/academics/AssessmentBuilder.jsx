import { useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert } from '../ui/Alert';
import { cn } from '../../lib/utils';

export function AssessmentBuilder({ value = [], onChange, disabled }) {
  const assessments = Array.isArray(value) ? value : [];

  const totalWeight = useMemo(
    () => assessments.reduce((sum, item) => sum + Number(item?.weight || 0), 0),
    [assessments]
  );

  const setItem = (index, field, fieldValue) => {
    const next = assessments.map((item, idx) =>
      idx === index ? { ...item, [field]: fieldValue } : item
    );
    onChange?.(next);
  };

  const addRow = () => {
    onChange?.([...assessments, { name: '', weight: '' }]);
  };

  const removeRow = (index) => {
    onChange?.(assessments.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Assessments</p>
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <span>Total weight:</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm transition-colors',
              totalWeight === 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            )}
          >
            {totalWeight}%
          </span>
        </div>
      </div>

      {totalWeight !== 100 ? (
        <Alert tone="warning" title="Weights must total 100%">
          Adjust the weights until they add up to 100. Backend validation will also enforce this.
        </Alert>
      ) : null}

      <div className="space-y-2">
        {assessments.map((item, index) => (
          <div
            key={`assessment-${index}`}
            className="flex flex-col gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-primary/50 md:flex-row md:items-center"
          >
            <Input
              value={item.name || ''}
              onChange={(event) => setItem(index, 'name', event.target.value)}
              placeholder="Assessment name"
              className="md:flex-1"
              disabled={disabled}
            />
            <div className="flex items-center gap-2 md:w-48">
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={item.weight ?? ''}
                onChange={(event) => setItem(index, 'weight', event.target.value)}
                placeholder="Weight %"
                disabled={disabled}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => removeRow(index)} disabled={disabled}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
        Add Assessment
      </Button>
    </div>
  );
}
