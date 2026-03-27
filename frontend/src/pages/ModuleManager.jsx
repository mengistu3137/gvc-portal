import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert } from '../components/ui/Alert';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { AssessmentBuilder } from '../components/academics/AssessmentBuilder';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultForm = {
  m_code: '',
  unit_competency: '',
  credit_units: 0,
  occupation_id: '',
  level_id: '',
  assessments: [],
};

export function ModuleManager() {
  const [form, setForm] = useState(defaultForm);
  const [activeTab, setActiveTab] = useState('details');
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({});

  const moduleCrud = useCrud('academics/modules');
  const occupationCrud = useCrud('academics/occupations');
  const levelCrud = useCrud('academics/levels');

  const modulesQuery = moduleCrud.list({ page: 1, limit: 300 });
  const occupationsQuery = occupationCrud.list({ page: 1, limit: 1000 });
  const levelsQuery = levelCrud.list({ page: 1, limit: 1000 });

  const createModule = moduleCrud.create();
  const updateModule = moduleCrud.update();
  const removeModule = moduleCrud.remove();

  const totalWeight = useMemo(
    () => (Array.isArray(form.assessments) ? form.assessments.reduce((sum, item) => sum + Number(item?.weight || 0), 0) : 0),
    [form.assessments]
  );

  useEffect(() => {
    if (formError) {
      setFormError('');
    }
  }, [form]);

  const onField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
console.log("form", form)
    const nextErrors = {
      m_code: form.m_code.trim() ? '' : 'Module code is required',
      unit_competency: form.unit_competency.trim() ? '' : 'Unit competency is required',
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

  /*   if (totalWeight !== 100) {
      setFormError('Assessment weights must add to 100%.');
      setActiveTab('assessments');
      return;
    } */

    const payload = {
      ...form,
      credit_units: Number(form.credit_units || 0),
      occupation_id: form.occupation_id ? Number(form.occupation_id) : null,
      level_id: form.level_id ? Number(form.level_id) : null,
      assessments: Array.isArray(form.assessments)
        ? form.assessments.map((item) => ({
            name: item?.name?.trim() || '',
            weight: Number(item?.weight || 0),
            max_weight: Number(item?.weight || 0),
          }))
        : [],
    };

    console.log('Submitting module payload', payload);

    try {
      if (editingId) {
        await updateModule.mutateAsync({ id: editingId, payload, method: 'put' });
      } else {
        await createModule.mutateAsync(payload);
      }
      setForm(defaultForm);
      setEditingId(null);
      setActiveTab('details');
      setErrors({});
    } catch (error) {
      setFormError(error.message || 'Unable to save module');
    }
  };

  const startEdit = (row) => {
    setEditingId(row.module_id);
    setForm({
      m_code: row.m_code || '',
      unit_competency: row.unit_competency || '',
      credit_units: row.credit_units || 0,
      occupation_id: row.occupation_id || '',
      level_id: row.level_id || '',
      assessments: Array.isArray(row.assessments) ? row.assessments : [],
    });
    setActiveTab('details');
    setErrors({});
  };

  const columns = useMemo(
    () => [
      { accessorKey: 'module_id', header: 'ID' },
      { accessorKey: 'm_code', header: 'Code' },
      { accessorKey: 'unit_competency', header: 'Unit Competency' },
      { accessorKey: 'credit_units', header: 'Credits' },
      {
        id: 'assessments',
        header: 'Assessments',
        cell: ({ row }) => `${Array.isArray(row.original.assessments) ? row.original.assessments.length : 0} items`,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => startEdit(row.original)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => removeModule.mutate(row.original.module_id)} disabled={removeModule.isPending}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [removeModule.isPending]
  );

  const isMutating = createModule.isPending || updateModule.isPending;
  const loadingMeta = modulesQuery.isLoading || occupationsQuery.isLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <span>{editingId ? 'Edit Module' : 'Create Module'}</span>
            <div className="flex gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <button
                type="button"
                className={`rounded-md px-3 py-1 ${activeTab === 'details' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                onClick={() => setActiveTab('details')}
              >
                Details
              </button>
              <button
                type="button"
                className={`rounded-md px-3 py-1 ${activeTab === 'assessments' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
                onClick={() => setActiveTab('assessments')}
              >
                Assessments
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formError ? <Alert tone="danger" title="Save failed">{formError}</Alert> : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            {activeTab === 'details' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  value={form.m_code}
                  onChange={(event) => onField('m_code', event.target.value)}
                  placeholder="Module code (e.g., ICT101)"
                  required
                />
                {errors.m_code ? <p className="text-[11px] text-red-600">{errors.m_code}</p> : null}
                <Input
                  value={form.unit_competency}
                  onChange={(event) => onField('unit_competency', event.target.value)}
                  placeholder="Unit competency name"
                  required
                />
                {errors.unit_competency ? <p className="text-[11px] text-red-600">{errors.unit_competency}</p> : null}
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.credit_units}
                  onChange={(event) => onField('credit_units', event.target.value)}
                  placeholder="Credit units"
                />
                <select
                  value={form.occupation_id}
                  onChange={(event) => {
                    onField('occupation_id', event.target.value);
                    onField('level_id', '');
                  }}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Occupation (optional)</option>
                  {(occupationsQuery.data || []).map((occ) => (
                    <option key={occ.occupation_id} value={occ.occupation_id}>
                      {occ.occupation_name}
                    </option>
                  ))}
                </select>
                <select
                  value={form.level_id}
                  onChange={(event) => onField('level_id', event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                  disabled={!form.occupation_id}
                >
                  <option value="">Level (optional)</option>
                  {(levelsQuery.data || [])
                    .filter((lvl) => !form.occupation_id || Number(lvl.occupation_id) === Number(form.occupation_id))
                    .map((level) => (
                      <option key={`${level.occupation_id}-${level.level_id}`} value={level.level_id}>
                        {level.level_name || `Level ${level.level_id}`}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}

            {activeTab === 'assessments' ? (
              <AssessmentBuilder
                value={form.assessments}
                onChange={(next) => onField('assessments', next)}
                disabled={isMutating}
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={isMutating || loadingMeta}>
                {isMutating ? 'Saving...' : editingId ? 'Update Module' : 'Create Module'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={() => { setForm(defaultForm); setEditingId(null); }} disabled={isMutating}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
        </CardHeader>
        <CardContent>
          {modulesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          {!modulesQuery.isLoading && (!modulesQuery.data || modulesQuery.data.length === 0) ? (
            <EmptyState title="No modules" description="Create modules with assessments to enable grading." />
          ) : null}

          {modulesQuery.data ? (
            <DataTable
              columns={columns}
              data={modulesQuery.data.rows || modulesQuery.data}
              isLoading={modulesQuery.isLoading}
              isFetching={modulesQuery.isFetching}
              error={modulesQuery.error}
              emptyTitle="No modules"
              emptyDescription="Create modules with assessments to enable grading."
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
