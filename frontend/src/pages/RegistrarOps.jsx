import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DataTable } from '../components/ui/DataTable';
import { useCrud } from '../hooks/useCrud';

export function RegistrarOps() {
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [transcriptStudentId, setTranscriptStudentId] = useState('');

  const enrollmentsCrud = useCrud('enrollment');
  const enrollmentsQuery = enrollmentsCrud.list({ page: 1, limit: 25, search: enrollmentSearch || undefined });

  const enrollmentColumns = useMemo(
    () => [
      { accessorKey: 'student_id', header: 'Student ID' },
      { accessorKey: 'full_name', header: 'Name' },
      { accessorKey: 'program_name', header: 'Program' },
      { accessorKey: 'batch', header: 'Batch' },
      { accessorKey: 'status', header: 'Status' },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enrollment Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search enrollment by name or student ID"
              value={enrollmentSearch}
              onChange={(event) => setEnrollmentSearch(event.target.value)}
              className="w-72"
            />
            <Button type="button">New Enrollment</Button>
          </div>
          <DataTable
            columns={enrollmentColumns}
            data={enrollmentsQuery.data}
            isLoading={enrollmentsQuery.isLoading}
            isFetching={enrollmentsQuery.isFetching}
            error={enrollmentsQuery.error}
            emptyTitle="No enrollments"
            emptyDescription="Add enrollments to see them here."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transcript & Grade Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Student ID for transcript"
              value={transcriptStudentId}
              onChange={(event) => setTranscriptStudentId(event.target.value)}
              className="w-64"
            />
            <Button type="button">Generate Transcript</Button>
            <Button type="button" variant="outline">
              Verify Grades
            </Button>
          </div>
          <p className="text-slate-600">Generate PDF transcripts, verify grade approvals, and confirm registrar sign-off.</p>
        </CardContent>
      </Card>
    </div>
  );
}
