import { useMemo, useState } from 'react';
import { HierarchicalHeader } from '../components/hierarchy/HierarchicalHeader';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { ImportMapperCard } from '../components/ui/ImportMapperCard';
import { Textarea } from '../components/ui/textarea';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';
import { hasPermission } from '../lib/permissions';

const STATUS_ACTIONS = {
  DRAFT: [{ label: 'Submit', next: 'SUBMITTED', permission: 'manage_grading' }],
  SUBMITTED: [
    { label: 'Approve HOD', next: 'HOD_APPROVED', permission: 'approve_grades_hod' },
    { label: 'Reject', next: 'REJECTED', permission: 'manage_grading' },
  ],
  HOD_APPROVED: [{ label: 'Finalize', next: 'FINALIZED', permission: 'finalize_grades_registrar' }],
  REJECTED: [{ label: 'Reopen', next: 'DRAFT', permission: 'manage_grading' }],
};

export function GradeApprovalDashboard() {
  const [skipNotes, setSkipNotes] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const submissionsCrud = useCrud('grading/submissions', {
    updatePath: (id) => `/grading/submissions/${id}/status`,
    mapUpdatePayload: (payload) => payload,
  });
  const submissionsQuery = submissionsCrud.list({ page: 1, limit: 200 });
  const updateSubmission = submissionsCrud.update();

  const handleTransition = (row, targetStatus) => {
    updateSubmission.mutate({
      id: row.submission_id,
      payload: {
        next_status: targetStatus,
        note: targetStatus === 'FINALIZED' ? skipNotes || row.note || null : row.note || null,
      },
      method: 'put',
    });
  };

  const importRows = async (rows, setProgress) => {
    const payload = rows.map((row) => ({
      student_pk: Number(row.student_pk),
      task_id: Number(row.task_id),
      batch_id: Number(row.batch_id),
      module_id: Number(row.module_id),
      obtained_score: Number(row.obtained_score),
    }));

    setProgress(50);
    await api.post('/grading/grades/bulk', { rows: payload });
    setProgress(100);

    return { successes: payload.length, errors: 0 };
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'submission_id',
        header: 'Submission',
      },
      {
        accessorKey: 'module_id',
        header: 'Module',
      },
      {
        accessorKey: 'batch_id',
        header: 'Batch',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="primary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'note',
        header: 'Note',
        cell: ({ row }) => row.original.note || '-',
      },
      {
        id: 'history',
        header: 'History',
        cell: ({ row }) => (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedSubmission(row.original)}
          >
            View History
          </Button>
        )
      },
      {
        id: 'advance',
        header: 'Workflow',
        cell: ({ row }) => {
          const actions = STATUS_ACTIONS[row.original.status] || [];

          if (actions.length === 0) {
            return <span className="text-xs text-slate-500">No action</span>;
          }

          return (
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => {
                const allowed = hasPermission(action.permission);
                const needsSkipNote = action.next === 'FINALIZED' && row.original.status === 'HOD_APPROVED';
                const blockedByNote = needsSkipNote && !skipNotes.trim();

                return (
                  <Button
                    key={`${row.original.submission_id}-${action.next}`}
                    size="sm"
                    variant={action.next === 'REJECTED' ? 'destructive' : 'default'}
                    onClick={() => handleTransition(row.original, action.next)}
                    disabled={!allowed || blockedByNote || updateSubmission.isPending}
                  >
                    {action.label}
                  </Button>
                );
              })}
            </div>
          );
        },
      },
    ],
    [updateSubmission, skipNotes]
  );

  const hierarchyItems = [
    { label: 'Sector: Engineering' },
    { label: 'Occupation: Software' },
    { label: 'Level: IV' },
    { label: 'Batch: 2015' },
  ];

  return (
    <div className="space-y-4">
      <HierarchicalHeader items={hierarchyItems} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Grade Approval Dashboard</span>
            <Button type="button" variant="outline" onClick={() => setImportOpen((value) => !value)}>
              Import from Excel/CSV
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-w-xl space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-600">Skip Notes</label>
            <Textarea
              value={skipNotes}
              onChange={(event) => setSkipNotes(event.target.value)}
              placeholder="Required for skip/escalation workflows"
            />
          </div>

          <DataTable
            columns={columns}
            data={submissionsQuery.data}
            isLoading={submissionsQuery.isLoading}
            isFetching={submissionsQuery.isFetching}
            error={submissionsQuery.error}
            emptyTitle="No pending submissions"
            emptyDescription="All submitted grades are processed."
          />

          <Card>
            <CardHeader>
              <CardTitle>Workflow History</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedSubmission ? (
                <p className="text-sm text-slate-500">Select a submission to view approval trail details.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">
                    Submission #{selectedSubmission.submission_id} for module {selectedSubmission.module_id}
                  </p>
                  {(selectedSubmission.workflow_history || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No workflow events recorded yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {selectedSubmission.workflow_history.map((entry, index) => (
                        <div key={`${selectedSubmission.submission_id}-${entry.status}-${index}`} className="rounded border border-slate-200 p-2 text-sm">
                          <div><span className="font-medium">Step:</span> {entry.status}</div>
                          <div><span className="font-medium">Completed:</span> {new Date(entry.completed_at).toLocaleString()}</div>
                          <div><span className="font-medium">By:</span> {entry.performed_by}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {importOpen ? (
            <ImportMapperCard
              open={importOpen}
              onClose={() => setImportOpen(false)}
              title="Import Grades from Excel/CSV"
              requiredFields={['student_pk', 'task_id', 'batch_id', 'module_id', 'obtained_score']}
              onImport={importRows}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
