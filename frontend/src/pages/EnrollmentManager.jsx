import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Alert } from '../components/ui/Alert';
import { DataTable } from '../components/ui/DataTable';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultForm = {
  student_pk: '',
  module_id: '',
  batch_id: '',
  status: 'ENROLLED',
};

export function EnrollmentManager() {
  const [form, setForm] = useState(defaultForm);
  const [eligibilityResult, setEligibilityResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const studentsCrud = useCrud('students');
  const modulesCrud = useCrud('academics/modules');
  const batchesCrud = useCrud('academics/batches');
  const enrollmentCrud = useCrud('enrollment');

  const studentsQuery = studentsCrud.list({ page: 1, limit: 300 });
  const modulesQuery = modulesCrud.list({ page: 1, limit: 300 });
  const batchesQuery = batchesCrud.list({ page: 1, limit: 300 });
  const enrollmentsQuery = enrollmentCrud.list({ status: 'ENROLLED' });
  const removeEnrollment = enrollmentCrud.remove();

  const onField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const checkEligibility = async () => {
    if (!form.student_pk || !form.module_id) {
      return;
    }

    setChecking(true);
    try {
      const response = await api.get(`/enrollment/eligibility/${form.student_pk}/${form.module_id}`);
      setEligibilityResult(response.payload);
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
      return;
    }

    setSubmitting(true);

    try {
      const eligibilityResponse = await api.get(`/enrollment/eligibility/${form.student_pk}/${form.module_id}`);
      const eligibility = eligibilityResponse.payload;
      setEligibilityResult(eligibility);

      if (!eligibility?.eligible) {
        toast.error('Enrollment blocked by missing prerequisites');
        return;
      }

      await api.post('/enrollment', {
        student_pk: Number(form.student_pk),
        module_id: Number(form.module_id),
        batch_id: Number(form.batch_id),
        status: form.status || 'ENROLLED',
      });

      toast.success('Enrollment created successfully');
      setForm(defaultForm);
      enrollmentsQuery.refetch();
    } catch (error) {
      toast.error(error.message || 'Enrollment failed');
    } finally {
      setSubmitting(false);
    }
  };

  const removeEnrollmentRow = async (enrollmentId) => {
    await removeEnrollment.mutateAsync(enrollmentId);
    enrollmentsQuery.refetch();
  };

  const enrollmentColumns = useMemo(
    () => [
      { accessorKey: 'enrollment_id', header: 'Enrollment ID' },
      {
        id: 'student',
        header: 'Student',
        cell: ({ row }) => `${row.original.student?.student_id || '-'} (PK: ${row.original.student_pk})`
      },
      {
        id: 'module',
        header: 'Module',
        cell: ({ row }) => row.original.module?.unit_competency || row.original.module?.m_code || row.original.module_id
      },
      {
        id: 'batch',
        header: 'Batch',
        cell: ({ row }) => row.original.batch?.batch_code || row.original.batch_id
      },
      { accessorKey: 'status', header: 'Status' },
      {
        id: 'actions',
        header: 'Action',
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => removeEnrollmentRow(row.original.enrollment_id)}
            disabled={removeEnrollment.isPending}
          >
            Remove
          </Button>
        )
      }
    ],
    [removeEnrollment.isPending]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Enrollment & Prerequisite Guard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="grid gap-2 md:grid-cols-2" onSubmit={submitEnrollment}>
            <select
              value={form.student_pk}
              onChange={(event) => onField('student_pk', event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
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
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
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
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
              required
            >
              <option value="">Select Batch</option>
              {(batchesQuery.data || []).map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_code}
                </option>
              ))}
            </select>

            <Input value={form.status} onChange={(event) => onField('status', event.target.value)} placeholder="Status" />

            <div className="md:col-span-2 flex gap-2">
              <Button type="button" variant="outline" onClick={checkEligibility} disabled={checking}>
                {checking ? 'Checking...' : 'Check Prerequisites'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Enrolling...' : 'Enroll Student'}
              </Button>
            </div>
          </form>

          {eligibilityResult ? (
            eligibilityResult.eligible ? (
              <Alert tone="success" title="Eligible">
                Student satisfies all prerequisites.
              </Alert>
            ) : (
              <Alert tone="danger" title="Enrollment blocked">
                Missing prerequisite modules: {eligibilityResult.missing.join(', ')}
              </Alert>
            )
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Enrollments</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={enrollmentsQuery.data}
            columns={enrollmentColumns}
            isLoading={enrollmentsQuery.isLoading}
            isFetching={enrollmentsQuery.isFetching}
            error={enrollmentsQuery.error}
            emptyTitle="No active enrollments"
            emptyDescription="Students enrolled in modules will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
