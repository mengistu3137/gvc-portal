import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultForm = {
  student_pk: '',
  module_id: '',
  batch_id: '',
  status: 'ENROLLED',
};

const statusOptions = ['ENROLLED', 'COMPLETED', 'DROPPED'];

export function EnrollmentManager() {
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [prereqForm, setPrereqForm] = useState({ module_id: '', required_module_id: '' });
  const [gpaForm, setGpaForm] = useState({ student_pk: '', batch_id: '' });
  const [gpaResult, setGpaResult] = useState(null);
  const [gpaLoading, setGpaLoading] = useState(false);

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
  };

  const resetPrereq = () => setPrereqForm({ module_id: '', required_module_id: '' });

  const createPrerequisite = async (event) => {
    event.preventDefault();
    if (!prereqForm.module_id || !prereqForm.required_module_id) {
      toast.error('Select both target module and prerequisite');
      return;
    }

    try {
      await api.post('/enrollment/prerequisites', {
        module_id: Number(prereqForm.module_id),
        required_module_id: Number(prereqForm.required_module_id),
      });
      toast.success('Prerequisite saved');
      resetPrereq();
    } catch (error) {
      toast.error(error.message || 'Could not save prerequisite');
    }
  };

  const calculateGpa = async (event) => {
    event.preventDefault();
    if (!gpaForm.student_pk || !gpaForm.batch_id) {
      toast.error('Select student and batch');
      return;
    }

    setGpaLoading(true);
    setGpaResult(null);
    try {
      const response = await api.get(`/enrollment/gpa/${gpaForm.student_pk}/${gpaForm.batch_id}`);
      setGpaResult(response.payload || response.raw);
    } catch (error) {
      toast.error(error.message || 'GPA calculation failed');
    } finally {
      setGpaLoading(false);
    }
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

    if (!form.student_pk || !form.module_id || !form.batch_id) {
      toast.error('Student, module, and batch are required');
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
              onChange={(event) => onField('student_pk', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Student</option>
              {(studentsQuery.data || []).map((student) => (
                <option key={student.student_pk} value={student.student_pk}>
                  {student.student_id} - {student.full_name}
                </option>
              ))}
            </select>

            <select
              value={form.module_id}
              onChange={(event) => onField('module_id', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Module</option>
              {(modulesQuery.data || []).map((moduleItem) => (
                <option key={moduleItem.module_id} value={moduleItem.module_id}>
                  {moduleItem.m_code} - {moduleItem.unit_competency}
                </option>
              ))}
            </select>

            <select
              value={form.batch_id}
              onChange={(event) => onField('batch_id', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Batch</option>
              {(batchesQuery.data || []).map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>

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
          <DataTable
            data={enrollmentsQuery.data}
            columns={enrollmentColumns}
            isLoading={enrollmentsQuery.isLoading}
            isFetching={enrollmentsQuery.isFetching}
            error={enrollmentsQuery.error}
            emptyTitle="No enrollments"
            emptyDescription="Students enrolled in modules will appear here."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Prerequisites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-2 md:grid-cols-3" onSubmit={createPrerequisite}>
            <select
              value={prereqForm.module_id}
              onChange={(event) => setPrereqForm((prev) => ({ ...prev, module_id: event.target.value }))}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">Target module</option>
              {(modulesQuery.data || []).map((moduleItem) => (
                <option key={moduleItem.module_id} value={moduleItem.module_id}>
                  {moduleItem.m_code} — {moduleItem.unit_competency}
                </option>
              ))}
            </select>

            <select
              value={prereqForm.required_module_id}
              onChange={(event) =>
                setPrereqForm((prev) => ({ ...prev, required_module_id: event.target.value }))
              }
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">Required prerequisite</option>
              {(modulesQuery.data || []).map((moduleItem) => (
                <option key={moduleItem.module_id} value={moduleItem.module_id}>
                  {moduleItem.m_code} — {moduleItem.unit_competency}
                </option>
              ))}
            </select>

            <Button type="submit" disabled={modulesQuery.isLoading}>Save prerequisite</Button>
          </form>

          <p className="text-xs text-slate-500">
            Prerequisites are enforced during eligibility checks; re-use the form above to add missing pairs.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GPA Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-2 md:grid-cols-3" onSubmit={calculateGpa}>
            <select
              value={gpaForm.student_pk}
              onChange={(event) => setGpaForm((prev) => ({ ...prev, student_pk: event.target.value }))}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select student</option>
              {(studentsQuery.data || []).map((student) => (
                <option key={student.student_pk} value={student.student_pk}>
                  {student.student_id} — {student.full_name}
                </option>
              ))}
            </select>

            <select
              value={gpaForm.batch_id}
              onChange={(event) => setGpaForm((prev) => ({ ...prev, batch_id: event.target.value }))}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select batch</option>
              {(batchesQuery.data || []).map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>

            <Button type="submit" disabled={gpaLoading}>
              {gpaLoading ? 'Calculating...' : 'Calculate GPA'}
            </Button>
          </form>

          {gpaResult ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <div><strong>Semester GPA:</strong> {gpaResult.semester_gpa}</div>
              <div><strong>Cumulative GPA:</strong> {gpaResult.cumulative_gpa}</div>
              <div><strong>Total credits:</strong> {gpaResult.total_credits}</div>
              <div><strong>Total grade points:</strong> {gpaResult.total_grade_points}</div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
