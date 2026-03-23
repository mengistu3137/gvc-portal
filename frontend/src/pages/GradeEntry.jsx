import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/skeleton';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';
import { AssessmentBuilder } from '../components/academics/AssessmentBuilder';

export function GradeEntry() {
  const studentsCrud = useCrud('students');
  const modulesCrud = useCrud('academics/modules');
  const batchesCrud = useCrud('academics/batches');

  const [form, setForm] = useState({ student_pk: '', module_id: '', batch_id: '', assessment_scores: [], total_score: '' });
  const [moduleAssessments, setModuleAssessments] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const studentsQuery = studentsCrud.list({ page: 1, limit: 300 });
  const modulesQuery = modulesCrud.list({ page: 1, limit: 300 });
  const batchesQuery = batchesCrud.list({ page: 1, limit: 300 });

  const gradeMutation = useMutation({
    mutationFn: async (payload) => api.post('/grading/grades', payload),
  });

  const moduleDetailQuery = useQuery({
    queryKey: ['module', form.module_id],
    enabled: Boolean(form.module_id),
    queryFn: async () => {
      const response = await api.get(`/academics/modules/${form.module_id}`);
      return response.payload;
    },
  });

  useEffect(() => {
    if (moduleDetailQuery.data && Array.isArray(moduleDetailQuery.data.assessments)) {
      setModuleAssessments(moduleDetailQuery.data.assessments);
      setForm((current) => ({ ...current, assessment_scores: moduleDetailQuery.data.assessments.map((item) => ({ name: item.name, score: '' })) }));
    } else {
      setModuleAssessments([]);
      setForm((current) => ({ ...current, assessment_scores: [] }));
    }
  }, [moduleDetailQuery.data]);

  const totalScore = useMemo(() => {
    if (!Array.isArray(form.assessment_scores)) return 0;
    return form.assessment_scores.reduce((sum, item) => sum + Number(item.score || 0), 0);
  }, [form.assessment_scores]);

  const onAssessmentScore = (index, value) => {
    setForm((current) => ({
      ...current,
      assessment_scores: current.assessment_scores.map((item, idx) => (idx === index ? { ...item, score: value } : item)),
    }));
  };

  const submitGrade = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (!form.student_pk || !form.module_id || !form.batch_id) {
      setErrorMessage('Student, module, and batch are required.');
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        student_pk: Number(form.student_pk),
        module_id: Number(form.module_id),
        batch_id: Number(form.batch_id),
        assessment_scores: form.assessment_scores.map((item) => ({ ...item, score: Number(item.score || 0) })),
        total_score: totalScore,
        final_score: totalScore,
      });
      setForm({ student_pk: '', module_id: '', batch_id: '', assessment_scores: [], total_score: '' });
      setModuleAssessments([]);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save grade');
    }
  };

  const isLoading = studentsQuery.isLoading || modulesQuery.isLoading || batchesQuery.isLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Grade Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage ? <Alert tone="danger" title="Save failed">{errorMessage}</Alert> : null}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : null}

          <form className="space-y-3" onSubmit={submitGrade}>
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={form.student_pk}
                onChange={(event) => setForm((current) => ({ ...current, student_pk: event.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
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
                value={form.module_id}
                onChange={(event) => setForm((current) => ({ ...current, module_id: event.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="">Select module</option>
                {(modulesQuery.data?.rows || modulesQuery.data || []).map((module) => (
                  <option key={module.module_id} value={module.module_id}>
                    {module.m_code} — {module.unit_competency}
                  </option>
                ))}
              </select>

              <select
                value={form.batch_id}
                onChange={(event) => setForm((current) => ({ ...current, batch_id: event.target.value }))}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                required
              >
                <option value="">Select batch</option>
                {(batchesQuery.data || []).map((batch) => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    {batch.batch_code}
                  </option>
                ))}
              </select>
            </div>

            {moduleAssessments.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Assessment scores</p>
                {form.assessment_scores.map((item, index) => (
                  <div key={`score-${index}`} className="flex items-center gap-2">
                    <div className="flex-1 text-sm text-slate-700">{item.name}</div>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.score ?? ''}
                      onChange={(event) => onAssessmentScore(index, event.target.value)}
                      className="w-28"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                  <span className="text-slate-600">Total score</span>
                  <span className="font-semibold text-primary">{totalScore}</span>
                </div>
              </div>
            ) : (
              <Alert tone="info" title="No assessments">
                Select a module with assessments to enter detailed scores. You can still submit a total score.
              </Alert>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={gradeMutation.isPending}>
                {gradeMutation.isPending ? 'Saving...' : 'Submit grade'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setForm({ student_pk: '', module_id: '', batch_id: '', assessment_scores: [], total_score: '' }); setModuleAssessments([]); }}>
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
