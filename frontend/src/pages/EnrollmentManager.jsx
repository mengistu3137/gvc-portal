import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultForm = {
  student_pk: '',
  module_id: '',
  batch_id: '',
  status: 'ENROLLED',
};

const statusOptions = ['ENROLLED', 'COMPLETED', 'DROPPED', 'WITHDRAWN'];

export function EnrollmentManager() {
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [gpaStudent, setGpaStudent] = useState('');
  const [gpaBatch, setGpaBatch] = useState('');
  const [gpaResult, setGpaResult] = useState(null);
  const [gpaLoading, setGpaLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const studentsCrud = useCrud('students');
  const modulesCrud = useCrud('academics/modules');
  const batchesCrud = useCrud('academics/batches');
  const enrollmentCrud = useCrud('enrollment');

  const studentsQuery = studentsCrud.list({ page: 1, limit: 300 });
  const modulesQuery = modulesCrud.list({ page: 1, limit: 300 });
  const batchesQuery = batchesCrud.list({ page: 1, limit: 300 });
  const enrollmentsQuery = enrollmentCrud.list({ page: 1, limit: 300 });

  const createEnrollment = enrollmentCrud.create();
  const updateEnrollment = enrollmentCrud.update();
  const removeEnrollment = enrollmentCrud.remove();

  const onField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
    setEligibilityResult(null);
    setErrors({});
  };

  const students = studentsQuery.data || [];
  const batches = batchesQuery.data || [];
  const modules = modulesQuery.data || [];

  const selectedBatch = useMemo(
    () => batches.find((batch) => String(batch.batch_id) === String(form.batch_id)),
    [batches, form.batch_id]
  );

  const derivedOccupationId = selectedBatch?.occupation_id ? String(selectedBatch.occupation_id) : '';

  const filteredModules = useMemo(
    () => modules.filter((moduleItem) => !derivedOccupationId || String(moduleItem.occupation_id) === derivedOccupationId),
    [modules, derivedOccupationId]
  );

  const handleStudentChange = (studentId) => {
    const student = students.find((item) => String(item.student_pk) === studentId);
    const nextBatchId = student?.batch_id ? String(student.batch_id) : '';
    setForm((current) => ({
      ...current,
      student_pk: studentId,
      batch_id: nextBatchId,
      module_id: '',
    }));
    setErrors((current) => ({ ...current, student_pk: '', batch_id: '', module_id: '' }));
  };

  const handleBatchChange = (batchId) => {
    setForm((current) => ({ ...current, batch_id: batchId, module_id: '' }));
    setErrors((current) => ({ ...current, batch_id: '', module_id: '' }));
  };

  const checkEligibility = async () => {
    if (!form.student_pk || !form.module_id) {
      toast.error('Select student and module first');
      return;
    }

    setChecking(true);
    try {
      const response = await api.get(`/enrollment/eligibility/${form.student_pk}/${form.module_id}`);
      const result = response.payload;
      setEligibilityResult(result);
      if (result?.eligible) {
        toast.success('Student is eligible for this module');
      } else {
        toast.error('Prerequisites missing for selected module');
      }
    } catch (error) {
      toast.error(error.message || 'Eligibility check failed');
      setEligibilityResult(null);
    } finally {
      setChecking(false);
    }
  };

  const submitEnrollment = async (event) => {
    event.preventDefault();
    if (isMutating) return;

    const nextErrors = {
      student_pk: form.student_pk ? '' : 'Student is required',
      batch_id: form.batch_id ? '' : 'Batch is required',
      module_id: derivedOccupationId && !form.module_id ? 'Module is required once occupation is known' : '',
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the required fields');
      return;
    }

    try {
      const eligibilityResponse = await api.get(`/enrollment/eligibility/${form.student_pk}/${form.module_id}`);
      const eligibility = eligibilityResponse.payload;
      setEligibilityResult(eligibility);

      if (!eligibility?.eligible) {
        toast.error('Enrollment blocked by missing prerequisites');
        return;
      }

      const payload = {
        student_pk: Number(form.student_pk),
        module_id: Number(form.module_id),
        batch_id: Number(form.batch_id),
        status: form.status || 'ENROLLED',
      };

      console.log('Submitting enrollment payload', payload);

      if (editingId) {
        await updateEnrollment.mutateAsync({ id: editingId, payload, method: 'put' });
      } else {
        await createEnrollment.mutateAsync(payload);
      }

      resetForm();
    } catch (error) {
      toast.error(error.message || 'Enrollment failed');
    }
  };

  const removeEnrollmentRow = async (enrollmentId) => {
    await removeEnrollment.mutateAsync(enrollmentId);
  };

  const setEditingRow = (row) => {
    setEditingId(row.enrollment_id);
    setForm({
      student_pk: String(row.student_pk || ''),
      module_id: String(row.module_id || ''),
      batch_id: String(row.batch_id || ''),
      status: row.status || 'ENROLLED',
    });
    setEligibilityResult(null);
    toast.success(`Editing enrollment #${row.enrollment_id}`);
  };

  const enrollmentColumns = useMemo(
    () => [
      { accessorKey: 'enrollment_id', header: 'Enrollment ID' },
      {
        id: 'student',
        header: 'Student',
        cell: ({ row }) => `${row.original.student?.student_id || '-'} (PK: ${row.original.student_pk})`,
      },
      {
        id: 'module',
        header: 'Module',
        cell: ({ row }) => row.original.module?.unit_competency || row.original.module?.m_code || row.original.module_id,
      },
      {
        id: 'batch',
        header: 'Batch',
        cell: ({ row }) => row.original.batch?.batch_code || row.original.batch_id,
      },
      { accessorKey: 'status', header: 'Status' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setEditingRow(row.original)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => removeEnrollmentRow(row.original.enrollment_id)}
              disabled={removeEnrollment.isPending}
            >
              Remove
            </Button>
          </div>
        ),
      },
    ],
    [removeEnrollment.isPending]
  );

  const isMutating = createEnrollment.isPending || updateEnrollment.isPending;

  const isLoadingLists =
    studentsQuery.isLoading || modulesQuery.isLoading || batchesQuery.isLoading || enrollmentsQuery.isLoading;

  const fetchGpa = async () => {
    if (!gpaStudent || !gpaBatch) {
      toast.error('Select student and batch to compute GPA');
      return;
    }
    setGpaLoading(true);
    setGpaResult(null);
    try {
      const response = await api.get(`/enrollment/gpa/${gpaStudent}/${gpaBatch}`);
      setGpaResult(response.payload);
    } catch (error) {
      toast.error(error.message || 'Failed to calculate GPA');
    } finally {
      setGpaLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Enrollment and Prerequisite Guard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-2 md:grid-cols-2" onSubmit={submitEnrollment}>
            <select
              value={form.student_pk}
              onChange={(event) => handleStudentChange(event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Student</option>
              {students.map((student) => (
                <option key={student.student_pk} value={student.student_pk}>
                  {student.student_id} - {student.full_name}
                </option>
              ))}
            </select>
            {errors.student_pk ? <p className="text-[11px] text-red-600">{errors.student_pk}</p> : null}

            <select
              value={form.module_id}
              onChange={(event) => onField('module_id', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              disabled={!derivedOccupationId}
            >
              <option value="">{derivedOccupationId ? 'Select Module' : 'Select occupation first'}</option>
              {filteredModules.map((moduleItem) => (
                <option key={moduleItem.module_id} value={moduleItem.module_id}>
                  {moduleItem.m_code} - {moduleItem.unit_competency}
                </option>
              ))}
            </select>
            {errors.module_id ? <p className="text-[11px] text-red-600">{errors.module_id}</p> : null}

            <select
              value={form.batch_id}
              onChange={(event) => handleBatchChange(event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>
            {errors.batch_id ? <p className="text-[11px] text-red-600">{errors.batch_id}</p> : null}

            <div className="md:col-span-2 text-[11px] text-slate-600">
              <p><strong>Derived occupation:</strong> {derivedOccupationId || 'Select a student or batch to load occupation'}</p>
              <p>{derivedOccupationId ? 'Modules are filtered by this occupation.' : 'Modules unlock after occupation is known.'}</p>
            </div>

            <select
              value={form.status}
              onChange={(event) => onField('status', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="flex gap-2 md:col-span-2">
              <Button type="button" variant="outline" onClick={checkEligibility} disabled={checking}>
                {checking ? 'Checking...' : 'Check Prerequisites'}
              </Button>
              <Button type="submit" disabled={isMutating}>
                {isMutating ? 'Saving...' : editingId ? 'Update Enrollment' : 'Enroll Student'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel Edit
                </Button>
              ) : null}
            </div>
          </form>

          {eligibilityResult ? (
            eligibilityResult.eligible ? (
              <Alert tone="success" title="Eligible">
                Student satisfies all prerequisites.
              </Alert>
            ) : (
              <Alert tone="danger" title="Enrollment blocked">
                Missing prerequisite modules:{' '}
                {(eligibilityResult.missing_modules || [])
                  .map((item) => item.module_name || `Module ${item.module_id}`)
                  .join(', ')}
              </Alert>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment Registry</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLists ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}
          {!isLoadingLists && (!enrollmentsQuery.data || enrollmentsQuery.data.length === 0) ? (
            <EmptyState title="No enrollments" description="Students enrolled in modules will appear here." />
          ) : null}
          {enrollmentsQuery.data ? (
            <DataTable
              data={enrollmentsQuery.data}
              columns={enrollmentColumns}
              isLoading={enrollmentsQuery.isLoading}
              isFetching={enrollmentsQuery.isFetching}
              error={enrollmentsQuery.error}
              emptyTitle="No enrollments"
              emptyDescription="Students enrolled in modules will appear here."
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GPA Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <select
              value={gpaStudent}
              onChange={(event) => setGpaStudent(event.target.value)}
              className="rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">Select Student</option>
              {(studentsQuery.data || []).map((student) => (
                <option key={student.student_pk} value={student.student_pk}>
                  {student.student_id} - {student.full_name}
                </option>
              ))}
            </select>

            <select
              value={gpaBatch}
              onChange={(event) => setGpaBatch(event.target.value)}
              className="rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">Select Batch</option>
              {(batchesQuery.data || []).map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <Button type="button" onClick={fetchGpa} disabled={gpaLoading}>
                {gpaLoading ? 'Calculating...' : 'Calculate GPA'}
              </Button>
              {gpaResult ? (
                <Button type="button" variant="outline" onClick={() => setGpaResult(null)}>
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {gpaResult ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Semester GPA</p>
                <p className="text-2xl font-bold text-primary">{gpaResult.semester_gpa}</p>
                <p className="text-xs text-slate-500">Credits: {gpaResult.total_credits}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase text-slate-600">Cumulative GPA</p>
                <p className="text-2xl font-bold text-primary">{gpaResult.cumulative_gpa}</p>
                <p className="text-xs text-slate-500">Grade points: {gpaResult.total_grade_points}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
