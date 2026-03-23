import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { DataTable } from '../components/ui/DataTable';
import { api } from '../lib/api';

const blankScaleRow = { min_score: '', max_score: '', letter_grade: '', grade_points: '', is_pass: true };

function GradeScaleBuilder({ value, onChange, disabled }) {
  const rows = Array.isArray(value) ? value : [];

  const setRow = (index, field, val) => {
    const next = rows.map((row, idx) => (idx === index ? { ...row, [field]: val } : row));
    onChange?.(next);
  };

  const addRow = () => onChange?.([...rows, { ...blankScaleRow }]);
  const removeRow = (index) => onChange?.(rows.filter((_, idx) => idx !== index));

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={`scale-${index}`}
          className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm md:grid-cols-5"
        >
          <Input
            type="number"
            min="0"
            max="100"
            value={row.min_score}
            onChange={(event) => setRow(index, 'min_score', event.target.value)}
            placeholder="Min"
            disabled={disabled}
          />
          <Input
            type="number"
            min="0"
            max="100"
            value={row.max_score}
            onChange={(event) => setRow(index, 'max_score', event.target.value)}
            placeholder="Max"
            disabled={disabled}
          />
          <Input
            value={row.letter_grade}
            onChange={(event) => setRow(index, 'letter_grade', event.target.value)}
            placeholder="Letter"
            disabled={disabled}
          />
          <Input
            type="number"
            step="0.01"
            value={row.grade_points}
            onChange={(event) => setRow(index, 'grade_points', event.target.value)}
            placeholder="Grade pts"
            disabled={disabled}
          />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={!!row.is_pass}
                onChange={(event) => setRow(index, 'is_pass', event.target.checked)}
                disabled={disabled}
              />
              Pass
            </label>
            <Button type="button" variant="outline" size="sm" onClick={() => removeRow(index)} disabled={disabled}>
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
        Add scale row
      </Button>
    </div>
  );
}

export function GradingPolicyManager() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ policy_name: '', grade_scale: [{ ...blankScaleRow }] });
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const policiesQuery = useQuery({
    queryKey: ['grading-policies'],
    queryFn: async () => {
      const response = await api.get('/grading/policies');
      return response.payload?.rows || response.payload || [];
    },
  });

  const createPolicy = useMutation({
    mutationFn: async (payload) => api.post('/grading/policies', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-policies'] });
    },
  });

  const updatePolicy = useMutation({
    mutationFn: async ({ id, payload }) => api.put(`/grading/policies/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grading-policies'] });
    },
  });

  useEffect(() => {
    setErrorMessage('');
  }, [form]);

  const onField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateScale = () => {
    const rows = Array.isArray(form.grade_scale) ? form.grade_scale : [];
    if (rows.length === 0) return 'Add at least one grade scale row';

    for (const row of rows) {
      const min = Number(row.min_score);
      const max = Number(row.max_score);
      if (Number.isNaN(min) || Number.isNaN(max)) return 'Scores must be numbers';
      if (min < 0 || max > 100 || min > max) return 'Scores must be between 0 and 100 and min <= max';
      if (!row.letter_grade) return 'Letter grade is required for each row';
    }
    return '';
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const validation = validateScale();
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    try {
      if (editingId) {
        await updatePolicy.mutateAsync({ id: editingId, payload: form });
      } else {
        await createPolicy.mutateAsync(form);
      }
      setForm({ policy_name: '', grade_scale: [{ ...blankScaleRow }] });
      setEditingId(null);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save policy');
    }
  };

  const startEdit = (policy) => {
    setEditingId(policy.policy_id);
    setForm({ policy_name: policy.policy_name, grade_scale: Array.isArray(policy.grade_scale) ? policy.grade_scale : [] });
  };

  const columns = useMemo(
    () => [
      { accessorKey: 'policy_id', header: 'ID' },
      { accessorKey: 'policy_name', header: 'Name' },
      {
        id: 'scale',
        header: 'Scale Items',
        cell: ({ row }) => `${Array.isArray(row.original.grade_scale) ? row.original.grade_scale.length : 0} rows`,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => startEdit(row.original)}>
              Edit
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const isMutating = createPolicy.isPending || updatePolicy.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Grading Policy' : 'Create Grading Policy'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? <Alert tone="danger" title="Validation failed">{errorMessage}</Alert> : null}
          <form className="space-y-3" onSubmit={onSubmit}>
            <Input
              value={form.policy_name}
              onChange={(event) => onField('policy_name', event.target.value)}
              placeholder="Policy name"
              required
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Grade scale</p>
              <GradeScaleBuilder value={form.grade_scale} onChange={(next) => onField('grade_scale', next)} disabled={isMutating} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isMutating}>
                {isMutating ? 'Saving...' : editingId ? 'Update Policy' : 'Create Policy'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm({ policy_name: '', grade_scale: [{ ...blankScaleRow }] }); }}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Grading Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {policiesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}
          {!policiesQuery.isLoading && (!policiesQuery.data || policiesQuery.data.length === 0) ? (
            <EmptyState title="No grading policies" description="Create a policy to unlock grade entry." />
          ) : null}
          {policiesQuery.data ? (
            <DataTable
              columns={columns}
              data={policiesQuery.data}
              isLoading={policiesQuery.isLoading}
              isFetching={policiesQuery.isFetching}
              error={policiesQuery.error}
              emptyTitle="No policies"
              emptyDescription="Create a policy to unlock grade entry."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
