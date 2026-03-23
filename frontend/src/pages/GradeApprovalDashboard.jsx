import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
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
import { Input } from '../components/ui/input';

const STATUS_ACTIONS = {
  DRAFT: [{ label: 'Submit', next: 'SUBMITTED', permission: 'manage_grading' }],
  SUBMITTED: [
    { label: 'Approve HOD', next: 'HOD_APPROVED', permission: 'approve_grades_hod' },
    { label: 'Reject', next: 'REJECTED', permission: 'manage_grading' },
  ],
  HOD_APPROVED: [{ label: 'Finalize', next: 'FINALIZED', permission: 'finalize_grades_registrar' }],
  REJECTED: [{ label: 'Reopen', next: 'DRAFT', permission: 'manage_grading' }],
};

const STATUS_STYLE = {
  DRAFT: 'outline',
  SUBMITTED: 'primary',
  HOD_APPROVED: 'success',
  QA_APPROVED: 'success',
  TVET_APPROVED: 'success',
  FINALIZED: 'accent',
  REJECTED: 'destructive',
};

export function GradeApprovalDashboard() {
  const [skipNotes, setSkipNotes] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [newSubmission, setNewSubmission] = useState({ module_id: '', batch_id: '' });
  const [selectedPolicyId, setSelectedPolicyId] = useState('');

  const submissionsCrud = useCrud('grading/submissions', {
    updatePath: (id) => `/grading/submissions/${id}/status`,
    mapUpdatePayload: (payload) => payload,
  });
  const submissionsQuery = submissionsCrud.list({ page: 1, limit: 200, status: statusFilter || undefined });
  const updateSubmission = submissionsCrud.update();

  const policiesCrud = useCrud('grading/policies', {
    mapList: (payload) => payload?.rows || payload || [],
  });
  const policiesQuery = policiesCrud.list();

  const scaleItemsCrud = useCrud('grading/policies/scale-items', {
    listPath: (params) => `/grading/policies/${params.policyId}/scale-items`,
    mapList: (payload) => payload?.rows || payload || [],
  });
  const scaleItemsQuery = selectedPolicyId
    ? scaleItemsCrud.list({ policyId: selectedPolicyId }, { enabled: true })
    : { data: [], isLoading: false, isFetching: false, error: null };

  const tasksCrud = useCrud('grading/tasks', {
    mapList: (payload) => payload?.rows || payload || [],
  });
  const tasksQuery = tasksCrud.list({ page: 1, limit: 200 });

  const handleTransition = (row, targetStatus) => {
    updateSubmission.mutate({
      id: row.submission_id,
      payload: {
        next_status: targetStatus,
        note: targetStatus === 'FINALIZED' ? skipNotes || row.note || null : row.note || null,
      },
      method: 'put',
    }, {
      onSuccess: () => {
        setSelectedSubmission((current) => {
          if (!current || current.submission_id !== row.submission_id) {
            return current;
          }
          return { ...current, status: targetStatus };
        });
      },
    });
  };

  const importRows = async (rows, setProgress, context = {}) => {
    if (!context.sourceFile) {
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
    }

    const formData = new FormData();
    formData.append('file', context.sourceFile);
    formData.append('mapping', JSON.stringify(context.mapping || {}));

    setProgress(25);
    const response = await api.post('/grading/grades/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setProgress(100);

    return {
      successes: Number(response.raw?.count || 0),
      errors: 0,
    };
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
        cell: ({ row }) => <Badge variant={STATUS_STYLE[row.original.status] || 'outline'}>{row.original.status}</Badge>,
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
                const blockedReason = !allowed
                  ? 'Permission required'
                  : blockedByNote
                    ? 'Skip note required'
                    : null;

                return (
                  <Button
                    key={`${row.original.submission_id}-${action.next}`}
                    size="sm"
                    variant={action.next === 'REJECTED' ? 'destructive' : 'default'}
                    onClick={() => handleTransition(row.original, action.next)}
                    disabled={!allowed || blockedByNote || updateSubmission.isPending}
                    title={blockedReason || `Move to ${action.next}`}
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

  const createSubmission = async (event) => {
    event.preventDefault();
    if (!newSubmission.module_id || !newSubmission.batch_id) {
      return;
    }

    try {
      await api.post('/grading/submissions', {
        module_id: Number(newSubmission.module_id),
        batch_id: Number(newSubmission.batch_id),
        status: 'DRAFT',
      });
      toast.success('Submission created');
      setNewSubmission({ module_id: '', batch_id: '' });
      submissionsQuery.refetch();
    } catch (error) {
      toast.error(error.message || 'Could not create submission');
    }
  };

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
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              type="number"
              placeholder="Module ID"
              value={newSubmission.module_id}
              onChange={(event) => setNewSubmission((prev) => ({ ...prev, module_id: event.target.value }))}
            />
            <Input
              type="number"
              placeholder="Batch ID"
              value={newSubmission.batch_id}
              onChange={(event) => setNewSubmission((prev) => ({ ...prev, batch_id: event.target.value }))}
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="HOD_APPROVED">HOD_APPROVED</option>
              <option value="QA_APPROVED">QA_APPROVED</option>
              <option value="TVET_APPROVED">TVET_APPROVED</option>
              <option value="FINALIZED">FINALIZED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => submissionsQuery.refetch()}>
                Refresh
              </Button>
              <Button type="button" onClick={createSubmission}>
                New Submission
              </Button>
            </div>
          </div>

          <div className="max-w-xl space-y-1">
            <label className="text-xs font-medium text-slate-600">Skip Notes</label>
            <Textarea
              value={skipNotes}
              onChange={(event) => setSkipNotes(event.target.value)}
              placeholder="Required for skip/escalation workflows"
            />
            <p className="text-[11px] text-slate-600">
              Finalize from HOD-approved state requires a skip note for a complete audit trail.
            </p>
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
              <CardTitle>Grading Policies & Scale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <select
                  value={selectedPolicyId}
                  onChange={(event) => setSelectedPolicyId(event.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                >
                  <option value="">Select policy</option>
                  {(policiesQuery.data || []).map((policy) => (
                    <option key={policy.policy_id} value={policy.policy_id}>
                      {policy.policy_name} {policy.is_locked ? '(locked)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <DataTable
                columns={[
                  { accessorKey: 'policy_id', header: 'Policy' },
                  { accessorKey: 'policy_name', header: 'Name' },
                  { accessorKey: 'is_locked', header: 'Locked' },
                ]}
                data={policiesQuery.data}
                isLoading={policiesQuery.isLoading}
                isFetching={policiesQuery.isFetching}
                error={policiesQuery.error}
                emptyTitle="No grading policies"
                emptyDescription="Create policies via API or seed to manage scales."
              />

              {selectedPolicyId ? (
                <DataTable
                  columns={[
                    { accessorKey: 'scale_item_id', header: 'ID' },
                    { accessorKey: 'letter_grade', header: 'Grade' },
                    { accessorKey: 'min_score', header: 'Min' },
                    { accessorKey: 'max_score', header: 'Max' },
                    { accessorKey: 'grade_points', header: 'Points' },
                    { accessorKey: 'is_pass', header: 'Pass' },
                  ]}
                  data={scaleItemsQuery.data}
                  isLoading={scaleItemsQuery.isLoading}
                  isFetching={scaleItemsQuery.isFetching}
                  error={scaleItemsQuery.error}
                  emptyTitle="No scale items"
                  emptyDescription="Add scale items to the selected policy."
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DataTable
                columns={[
                  { accessorKey: 'task_id', header: 'Task' },
                  { accessorKey: 'task_name', header: 'Name' },
                  { accessorKey: 'task_type', header: 'Type' },
                  { accessorKey: 'batch_id', header: 'Batch' },
                  { accessorKey: 'module_id', header: 'Module' },
                  { accessorKey: 'max_weight', header: 'Weight' },
                ]}
                data={tasksQuery.data}
                isLoading={tasksQuery.isLoading}
                isFetching={tasksQuery.isFetching}
                error={tasksQuery.error}
                emptyTitle="No tasks"
                emptyDescription="Add module-level tasks to start grading."
              />
            </CardContent>
          </Card>

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
                  <div>
                    <Badge variant={STATUS_STYLE[selectedSubmission.status] || 'outline'}>
                      Current status: {selectedSubmission.status}
                    </Badge>
                  </div>
                  {(selectedSubmission.workflow_history || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No workflow events recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedSubmission.workflow_history.map((entry, index) => (
                        <div
                          key={`${selectedSubmission.submission_id}-${entry.status}-${index}`}
                          className="relative rounded border border-primary/15 bg-primary/5 p-2 pl-4 text-xs"
                        >
                          <span className="absolute left-1.5 top-3 h-2 w-2 rounded-full bg-accent" />
                          <div><span className="font-semibold text-primary">Step:</span> {entry.status}</div>
                          <div><span className="font-semibold text-primary">Completed:</span> {new Date(entry.completed_at).toLocaleString()}</div>
                          <div><span className="font-semibold text-primary">By:</span> {entry.performed_by}</div>
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
