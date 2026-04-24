import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/button';
import { Save } from 'lucide-react';

export function GradebookGrid({ offeringId }) {
  const [data, setData] = useState(null); // { assessments: [], students: [] }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [offeringId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // This endpoint returns the full matrix: Students + Assessments + Scores
      const res = await api.get(`/enrollment/offering/${offeringId}/students-with-grades`);
      setData(res.payload || null);
    } catch (error) {
      toast.error("Failed to load gradebook");
    } finally {
      setLoading(false);
    }
  };

  // Handle score change in input
  const handleScoreChange = (studentIndex, assessmentId, newValue) => {
    const updatedStudents = [...data.students];
    const student = updatedStudents[studentIndex];
    
    // Find the specific grade object
    const gradeIndex = student.grades.findIndex(g => g.assessment_id === assessmentId);
    if (gradeIndex !== -1) {
      student.grades[gradeIndex].score = newValue;
    }
    setData({ ...data, students: updatedStudents });
  };

  // Save All Grades
  const handleSave = async () => {
    setSaving(true);
    try {
      // We need to map the UI structure back to the API payload
      // API expects: { student_pk, offering_id, assessment_scores: [{ name, score, weight }] }
      
      const payload = data.students.map(student => ({
        student_pk: student.student_pk,
        offering_id,
        assessment_scores: student.grades.map(g => ({
          assessment_id: g.assessment_id, // Send ID to ensure mapping
          name: g.name, // Backend matches by name or ID
          score: g.score,
          weight: g.weight
        }))
      }));

      await api.post('/grading/grades/bulk', { rows: payload });
      toast.success("Grades saved successfully");
      fetchData(); // Refresh to get calculated totals/letter grades
    } catch (error) {
      toast.error("Failed to save grades");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Loading gradebook...</div>;
  if (!data) return <div>No data available.</div>;

  return (
    <div className="bg-white rounded-xl border border-border-strong shadow-panel overflow-hidden flex flex-col h-[600px]">
      {/* Toolbar */}
      <div className="p-4 border-b border-border-strong bg-surface-muted flex justify-between items-center">
        <div className="font-bold text-brand-ink">
          {data.total_students} Students Enrolled
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-brand-blue text-white">
          <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Scrollable Table Area */}
      <div className="overflow-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-muted sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 border-r border-border-strong min-w-[200px] sticky left-0 bg-surface-muted z-20">Student Name</th>
              {data.assessments.map((assess) => (
                <th key={assess.assessment_id} className="p-3 border-r border-border-bold min-w-[100px] text-center">
                  <div className="font-bold text-primary text-xs">{assess.name}</div>
                  <div className="text-[10px] text-slate-500">{assess.weight}%</div>
                </th>
              ))}
              <th className="p-3 bg-brand-blue/5 text-center min-w-[100px]">
                <div className="font-bold text-primary text-xs">Total</div>
                <div className="text-[10px] text-slate-500">Letter</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.students.map((student, sIdx) => (
              <tr key={student.student_pk} className="hover:bg-surface-muted/50 group">
                <td className="p-3 border-r border-border-strong sticky left-0 bg-white group-hover:bg-surface-muted/50 z-10">
                  <div className="font-bold text-sm text-brand-ink">{student.full_name}</div>
                  <div className="text-xs text-slate-500">{student.student_id}</div>
                </td>
                
                {student.grades.map((grade) => (
                  <td key={grade.assessment_id} className="p-2 border-r border-border-strong text-center">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 focus:border-brand-blue focus:bg-white rounded px-1 py-1 text-sm font-medium text-slate-700 outline-none transition-colors"
                      value={grade.score ?? ''}
                      onChange={(e) => handleScoreChange(sIdx, grade.assessment_id, e.target.value)}
                    />
                  </td>
                ))}

                <td className="p-3 text-center bg-brand-blue/5">
                  {student.final_result ? (
                    <>
                      <div className="font-bold text-brand-ink">{student.final_result.total_score.toFixed(1)}</div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        student.final_result.status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {student.final_result.letter_grade}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}