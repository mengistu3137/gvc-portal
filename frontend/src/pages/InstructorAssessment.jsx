import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { Input } from '../components/ui/input';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultFilters = {
  occupation_id: '',
  level_id: '',
  module_id: '',
};

export function InstructorAssessment() {
  const [filters, setFilters] = useState(defaultFilters);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [pageParams, setPageParams] = useState({ page: 1, limit: 50 });
  const [taskId, setTaskId] = useState('');
  const [batchId, setBatchId] = useState('');

  const modulesCrud = useCrud('academics/modules');
  const studentsCrud = useCrud('students');
  const batchesCrud = useCrud('academics/batches');

  const modulesQuery = modulesCrud.list({ page: 1, limit: 500, occupation_id: filters.occupation_id });
  const batchesQuery = batchesCrud.list({
    page: 1,
    limit: 500,
    occupation_id: filters.occupation_id || undefined,
    level_id: filters.level_id || undefined,
  });
  const studentsQuery = studentsCrud.list({
    page: pageParams.page,
    limit: pageParams.limit,
    occupation_id: filters.occupation_id || undefined,
    level_id: filters.level_id || undefined,
    search: filters.search || undefined,
  });

  const onFilterChange = (field, value) => {
    setFilters((current) => {
      const next = { ...current, [field]: value };
      if (field === 'occupation_id') {
        next.level_id = '';
        next.module_id = '';
        setBatchId('');
      }
      return next;
    });
  };

  const toggleStudent = (student_pk, checked) => {
    setSelectedStudents((current) => {
      if (checked) return Array.from(new Set([...current, student_pk]));
      return current.filter((id) => id !== student_pk);
    });
  };

  const updateMark = (student_pk, value) => {
    setMarks((current) => ({ ...current, [student_pk]: value }));
  };

  const applyBulkMark = (value) => {
    const next = { ...marks };
    selectedStudents.forEach((id) => {
      next[id] = value;
    });
    setMarks(next);
  };

  const saveMarks = async () => {
    if (!filters.module_id || !batchId || !taskId) {
      toast.error('Select module, batch, and task id');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Select at least one student');
      return;
    }

    const rows = selectedStudents.map((student_pk) => ({
      student_pk,
      module_id: Number(filters.module_id),
      batch_id: Number(batchId),
      task_id: Number(taskId),
      obtained_score: Number(marks[student_pk] ?? 0),
    }));

    try {
      await api.post('/grading/grades/bulk', { rows });
      toast.success('Marks saved');
    } catch (error) {
      toast.error(error.message || 'Failed to save marks');
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedStudents.includes(row.original.student_pk)}
            onChange={(event) => toggleStudent(row.original.student_pk, event.target.checked)}
          />
        ),
      },
      { accessorKey: 'student_id', header: 'ID' },
      { accessorKey: 'full_name', header: 'Name' },
      { accessorKey: 'occupation_name', header: 'Occupation' },
      { accessorKey: 'level_name', header: 'Level' },
      {
        id: 'mark',
        header: 'Mark',
        cell: ({ row }) => (
          <Input
            type="number"
            value={marks[row.original.student_pk] || ''}
            onChange={(event) => updateMark(row.original.student_pk, event.target.value)}
            className="h-9 w-24"
          />
        ),
      },
    ],
    [selectedStudents, marks]
  );

  const selectedModule = (modulesQuery.data || []).find((m) => String(m.module_id) === String(filters.module_id));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Instructor Assessment Planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              placeholder="Filter by occupation id (optional)"
              value={filters.occupation_id}
              onChange={(event) => onFilterChange('occupation_id', event.target.value)}
            />
            <Input
              placeholder="Filter by level (I/II/III/IV)"
              value={filters.level_id}
              onChange={(event) => onFilterChange('level_id', event.target.value)}
            />
            <select
              value={filters.module_id}
              onChange={(event) => onFilterChange('module_id', event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="">Select Module</option>
              {(modulesQuery.data || []).map((mod) => (
                <option key={mod.module_id} value={mod.module_id}>
                  {mod.m_code} — {mod.unit_competency}
                </option>
              ))}
            </select>
            <Input
              placeholder="Search students"
              value={filters.search || ''}
              onChange={(event) => onFilterChange('search', event.target.value)}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Assessment task id"
              value={taskId}
              onChange={(event) => setTaskId(event.target.value)}
            />
            <select
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="">Select batch</option>
              {(batchesQuery.data || []).map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Selected Module:</span>
              <span className="font-semibold">{selectedModule ? selectedModule.unit_competency : 'None'}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
            <span>Selected Module: {selectedModule ? selectedModule.unit_competency : 'None'}</span>
            <span className="text-slate-400">|</span>
            <span>Roster page size: {pageParams.limit}</span>
            <div className="inline-flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPageParams((p) => ({ ...p, limit: 50 }))}
              >
                50 per page
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPageParams((p) => ({ ...p, limit: 100 }))}
              >
                100 per page
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <span>Bulk mark entry</span>
            <Input
              type="number"
              placeholder="Enter score"
              onChange={(event) => applyBulkMark(event.target.value)}
              className="h-9 w-24"
            />
            <span className="text-slate-500">Applies to currently selected students</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            key={`roster-${pageParams.limit}`}
            columns={columns}
            data={studentsQuery.data}
            isLoading={studentsQuery.isLoading}
            isFetching={studentsQuery.isFetching}
            error={studentsQuery.error}
            emptyTitle="No students"
            emptyDescription="Adjust filters to load students."
            initialPageSize={pageParams.limit}
            pageSizeOptions={[25, 50, 100]}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Selected students: {selectedStudents.length}</span>
            <Button type="button" size="sm" onClick={saveMarks}>
              Save Marks
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
