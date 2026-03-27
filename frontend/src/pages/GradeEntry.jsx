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
  const offeringsCrud = useCrud('offerings');

  const [form, setForm] = useState({
    student_pk: '',
    offering_id: null,
    assessment_scores: [],
  });

  const [moduleAssessments, setModuleAssessments] = useState([]);
  console.log("module assse",moduleAssessments)
  const [errorMessage, setErrorMessage] = useState('');

  /* ================= LIST QUERIES ================= */

  const studentsQuery = studentsCrud.list({ page: 1, limit: 300 });
  const offeringsQuery = offeringsCrud.list({ page: 1, limit: 300 });

  /* ================= MODULE DETAIL QUERY ================= */

  const moduleDetailQuery = useQuery({
    queryKey: ['offering-assessments', form.offering_id],
    queryFn: async () => {
      const res = await api.get(`/grading/assessments/${form.offering_id}`);
      return res.payload || res.data || [];
    },
    enabled: false,
  });

  /* ===== Trigger fetch when module changes ===== */

  useEffect(() => {
    if (form.offering_id) {
      moduleDetailQuery.refetch();
    }
  }, [form.offering_id]);

  /* ===== When module detail arrives ===== */

  useEffect(() => {
    if (Array.isArray(moduleDetailQuery.data)) {
      setModuleAssessments(moduleDetailQuery.data);

      setForm((current) => ({
        ...current,
        assessment_scores: moduleDetailQuery.data.map((a) => ({
          name: a.name,
          weight: a.weight,
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
    return form.assessment_scores.reduce((sum, item) => {
      const weight = Number(item.weight || 0);
      const score = Number(item.score || 0);
      return sum + (score * weight) / 100;
    }, 0);
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

    if (!form.student_pk || !form.offering_id) {
      setErrorMessage('Student and offering are required.');
      return;
    }

    try {
      await gradeMutation.mutateAsync({
        student_pk: Number(form.student_pk),
        offering_id: Number(form.offering_id),
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
        offering_id: null,
        assessment_scores: [],
      });
      setModuleAssessments([]);

    } catch (err) {
      setErrorMessage(err.message || 'Unable to save grade');
    }
  };

  const isLoading =
    studentsQuery.isLoading ||
    offeringsQuery.isLoading;

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

              {/* OFFERING */}
              <select
                value={form.offering_id || ''}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    offering_id: Number(e.target.value),
                  }))
                }
                className="rounded-md border px-3 py-2 text-sm"
                required
              >
                <option value="">Select offering</option>
                {(offeringsQuery.data || []).map((o) => (
                  <option key={o.offering_id} value={o.offering_id}>
                    {o.module?.m_code || o.module_id} — {o.batch?.batch_code || `Level ${o.batch?.level_id}`} — Section {o.section_code}
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
                    offering_id: null,
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