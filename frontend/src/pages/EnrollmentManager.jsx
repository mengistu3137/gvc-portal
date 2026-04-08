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
  offering_id: '',
  level_id: '',
  status: 'ENROLLED',
};

// Backend enum for enrollments is limited to ENROLLED or DROPPED
const statusOptions = ['ENROLLED', 'DROPPED'];

export function EnrollmentManager() {
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [gpaStudent, setGpaStudent] = useState('');
  const [gpaLevel, setGpaLevel] = useState('');
  const [gpaResult, setGpaResult] = useState(null);
  const [gpaLoading, setGpaLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const studentsCrud = useCrud('students');
  const sectorsCrud = useCrud('academics/sectors');
  const levelsCrud = useCrud('academics/levels');
  const offeringsCrud = useCrud('offerings');
  const enrollmentCrud = useCrud('enrollment');

  const studentsQuery = studentsCrud.list({ page: 1, limit: 300 });
  const levelsQuery = levelsCrud.list({ page: 1, limit: 1000 });
  const offeringsQuery = offeringsCrud.list({ page: 1, limit: 1000 });
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
    setErrors({});
  };

  const students = studentsQuery.data || [];
  const levels = levelsQuery.data || [];
  const offerings = offeringsQuery.data || [];

  const selectedStudent = useMemo(
    () => students.find((item) => String(item.student_pk) === String(form.student_pk)),
    [students, form.student_pk]
  );

  const derivedLevelId = selectedStudent?.level_id ? String(selectedStudent.level_id) : form.level_id;

  const filteredOfferings = useMemo(
    () => offerings.filter((offering) => {
      const levelMatch = !derivedLevelId || String(offering.batch?.level_id || offering.batch_id) === derivedLevelId;
      return levelMatch;
    }),
    [offerings, derivedLevelId]
  );

  const handleStudentChange = (studentId) => {
    const student = students.find((item) => String(item.student_pk) === studentId);
    setForm((current) => ({
      ...current,
      student_pk: studentId,
      level_id: student?.level_id ? String(student.level_id) : '',
      offering_id: '',
    }));
    setErrors((current) => ({ ...current, student_pk: '', level_id: '', offering_id: '' }));
  };

  const submitEnrollment = async (event) => {
    event.preventDefault();
    if (isMutating) return;

    const nextErrors = {
      student_pk: form.student_pk ? '' : 'Student is required',
      level_id: form.level_id ? '' : 'Level is required',
      offering_id: form.offering_id ? '' : 'Offering is required',
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      toast.error('Please fix the required fields');
      return;
    }

    try {
      const payload = {
        student_pk: Number(form.student_pk),
        offering_id: Number(form.offering_id),
        level_id: Number(form.level_id),
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
    if (window.confirm('Are you sure you want to remove this enrollment?')) {
      await removeEnrollment.mutateAsync(enrollmentId);
    }
  };

  const setEditingRow = (row) => {
    setEditingId(row.enrollment_id);
    setForm({
      student_pk: String(row.student_pk || ''),
      offering_id: String(row.offering_id || ''),
      level_id: String(row.level_id || row.offering?.batch?.level_id || ''),
      status: row.status || 'ENROLLED',
    });
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
        id: 'offering',
        header: 'Offering',
        cell: ({ row }) => {
          const offering = row.original.offering || row.original.module_offering;
          const module = offering?.module;
          const batch = offering?.batch;
          return `${module?.m_code || module?.unit_competency || offering?.module_id || 'Module'} — ${batch?.batch_code || batch?.level_id || 'N/A'} (${offering?.section_code || 'Section'})`;
        },
      },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) => row.original.level_id || row.original.offering?.batch?.level_id || '-',
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
    studentsQuery.isLoading || levelsQuery.isLoading || offeringsQuery.isLoading || enrollmentsQuery.isLoading;

  const fetchGpa = async () => {
    if (!gpaStudent || !gpaLevel) {
      toast.error('Select student and level to compute GPA');
      return;
    }
    setGpaLoading(true);
    setGpaResult(null);
    try {
      const response = await api.get(`/enrollment/gpa/${gpaStudent}/${gpaLevel}`);
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
          <CardTitle>Enrollment by Module Offering</CardTitle>
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
              value={form.level_id}
              onChange={(event) => onField('level_id', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Level</option>
              {levels.map((level) => (
                <option key={`${level.occupation_id}-${level.level_id}`} value={level.level_id}>
                  Level {level.level_name || level.level_id} — Occupation {level.occupation_id}
                </option>
              ))}
            </select>
            {errors.level_id ? <p className="text-[11px] text-red-600">{errors.level_id}</p> : null}

            <select
              value={form.offering_id}
              onChange={(event) => onField('offering_id', event.target.value)}
              className="h-8 rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
              required
            >
              <option value="">Select Module Offering</option>
              {filteredOfferings.map((offering) => (
                <option key={offering.offering_id} value={offering.offering_id}>
                  {offering.module?.m_code || offering.module_id} — {offering.batch?.batch_code || `Level ${offering.batch?.level_id}`} — Section {offering.section_code}
                </option>
              ))}
            </select>
            {errors.offering_id ? <p className="text-[11px] text-red-600">{errors.offering_id}</p> : null}

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
              value={gpaLevel}
              onChange={(event) => setGpaLevel(event.target.value)}
              className="rounded-md border border-primary/20 bg-white px-2 py-1 text-xs"
            >
              <option value="">Select Level</option>
              {levels.map((level) => (
                <option key={`${level.occupation_id}-${level.level_id}`} value={level.level_id}>
                  Level {level.level_name || level.level_id}
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
                <p className="text-xs font-semibold uppercase text-slate-600">Level GPA</p>
                <p className="text-2xl font-bold text-primary">{gpaResult.level_gpa}</p>
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
