import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Alert } from '../components/ui/Alert';
import { Skeleton } from '../components/ui/skeleton';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

export function GradeEntry() {
  const studentsCrud = useCrud('students');
  const modulesCrud = useCrud('academics/modules');
  const batchesCrud = useCrud('academics/batches');

  const [form, setForm] = useState({
    student_pk: '',
    module_id: null,
    batch_id: '',
    assessment_scores: [],
  });

  const [moduleAssessments, setModuleAssessments] = useState([]);
  console.log("module assse",moduleAssessments)
  const [errorMessage, setErrorMessage] = useState('');

  /* ================= LIST QUERIES ================= */

  const studentsQuery = studentsCrud.list({ page: 1, limit: 300 });
  const modulesQuery = modulesCrud.list({ page: 1, limit: 300 });
  const batchesQuery = batchesCrud.list({ page: 1, limit: 300 });

  /* ================= MODULE DETAIL QUERY ================= */

  const moduleDetailQuery = useQuery({
    queryKey: ['module-detail', form.module_id],
    queryFn: async () => {
      const res = await api.get(`/academics/modules/${form.module_id}`);
      console.log("🔥 MODULE DETAIL RESPONSE:", res.data);
      return res.data;   // VERY IMPORTANT (not payload)
    },
    enabled: false,   // manual control (BEST PRACTICE)
  });

  /* ===== Trigger fetch when module changes ===== */

  useEffect(() => {
    if (form.module_id) {
      console.log("✅ Fetching module detail for:", form.module_id);
      moduleDetailQuery.refetch();
    }
  }, [form.module_id]);

  /* ===== When module detail arrives ===== */

  useEffect(() => {
    if (
      moduleDetailQuery.data &&
      Array.isArray(moduleDetailQuery.data.assessments)
    ) {
      setModuleAssessments(moduleDetailQuery.data.assessments);

      setForm((current) => ({
        ...current,
        assessment_scores:
          moduleDetailQuery.data.assessments.map((a) => ({
            name: a.name,
            score: '',
          })),
      }));
    } else {
      setModuleAssessments([]);
      setForm((current) => ({
        ...current,
        assessment_scores: [],
      }));
    }
  }, [moduleDetailQuery.data]);

  /* ================= TOTAL SCORE ================= */

  const totalScore = useMemo(() => {
    return form.assessment_scores.reduce(
      (sum, item) => sum + Number(item.score || 0),
      0
    );
  }, [form.assessment_scores]);

  const onAssessmentScore = (index, value) => {
    setForm((current) => ({
      ...current,
      assessment_scores: current.assessment_scores.map((item, idx) =>
        idx === index ? { ...item, score: value } : item
      ),
    }));
  };

  /* ================= SAVE GRADE ================= */

  const gradeMutation = useMutation({
    mutationFn: async (payload) =>
      api.post('/grading/grades', payload),
  });

  const submitGrade = async (e) => {
    e.preventDefault();
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
        assessment_scores: form.assessment_scores.map((a) => ({
          ...a,
          score: Number(a.score || 0),
        })),
        total_score: totalScore,
        final_score: totalScore,
      });

      /* RESET */
      setForm({
        student_pk: '',
        module_id: null,
        batch_id: '',
        assessment_scores: [],
      });
      setModuleAssessments([]);

    } catch (err) {
      setErrorMessage(err.message || 'Unable to save grade');
    }
  };

  const isLoading =
    studentsQuery.isLoading ||
    modulesQuery.isLoading ||
    batchesQuery.isLoading;

  /* ================= UI ================= */

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Grade Entry</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          {errorMessage && (
            <Alert tone="danger" title="Save failed">
              {errorMessage}
            </Alert>
          )}

          {moduleDetailQuery.isError && (
            <Alert tone="danger" title="Module fetch failed">
              {moduleDetailQuery.error?.message}
            </Alert>
          )}

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          <form className="space-y-3" onSubmit={submitGrade}>
            <div className="grid gap-3 md:grid-cols-3">

              {/* STUDENT */}
              <select
                value={form.student_pk}
                onChange={(e) =>
                  setForm((c) => ({ ...c, student_pk: e.target.value }))
                }
                className="rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select student</option>
                {(studentsQuery.data || []).map((s) => (
                  <option key={s.student_pk} value={s.student_pk}>
                    {s.student_id} — {s.full_name}
                  </option>
                ))}
              </select>

              {/* MODULE */}
              <select
                value={form.module_id || ''}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    module_id: Number(e.target.value),   // ⭐ FIX
                  }))
                }
                className="rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select module</option>
                {(modulesQuery.data?.rows || modulesQuery.data || []).map((m) => (
                  <option key={m.module_id} value={m.module_id}>
                    {m.m_code} — {m.unit_competency}
                  </option>
                ))}
              </select>

              {/* BATCH */}
              <select
                value={form.batch_id}
                onChange={(e) =>
                  setForm((c) => ({ ...c, batch_id: e.target.value }))
                }
                className="rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select batch</option>
                {(batchesQuery.data || []).map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_code}
                  </option>
                ))}
              </select>

            </div>

            {/* ASSESSMENTS */}
            {moduleAssessments.length > 0 ? (
              <div className="border rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold uppercase">
                  Assessment Scores
                </p>

                {form.assessment_scores.map((item, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1">{item.name}</div>
                    <Input
                      type="number"
                      value={item.score}
                      onChange={(e) =>
                        onAssessmentScore(i, e.target.value)
                      }
                      className="w-28"
                    />
                  </div>
                ))}

                <div className="flex justify-between bg-white px-3 py-2 rounded">
                  <span>Total Score</span>
                  <span className="font-bold">{totalScore}</span>
                </div>
              </div>
            ) : (
              <Alert tone="info" title="No assessments">
                Select module to load assessments
              </Alert>
            )}

            <div className="flex gap-2">
              <Button type="submit">
                {gradeMutation.isPending ? 'Saving...' : 'Submit Grade'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm({
                    student_pk: '',
                    module_id: null,
                    batch_id: '',
                    assessment_scores: [],
                  });
                  setModuleAssessments([]);
                }}
              >
                Reset
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}