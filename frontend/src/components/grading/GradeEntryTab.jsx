import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { GraduationCap, Search, Save, X } from 'lucide-react'; // Added Search and X icons
import { toast } from 'react-hot-toast';
import { api } from '../../lib/api';

export  function GradeEntryTab({ refreshData }) {
  // --- State ---
  const [offerings, setOfferings] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [assessments, setAssessments] = useState([]);
  
  // The Grid Data
  const [studentGrades, setStudentGrades] = useState([]);
  
  // NEW: Search State
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGrades, setIsLoadingGrades] = useState(false);

  // --- Logic ---
  const fetchOfferings = async () => {
    try {
      const res = await api.get('/offerings'); 
      setOfferings(res.payload || []); 
    } catch (error) {
      toast.error("Failed to load classes");
    }
  };

  useEffect(() => {
    if (selectedOffering) {
      setStudentGrades([]);
      setAssessments([]);
      setSearchTerm(''); // Reset search when switching classes
      fetchStudentGrades();
    }
  }, [selectedOffering]);

  const fetchStudentGrades = async () => {
    if (!selectedOffering) return;
    try {
      setIsLoadingGrades(true);
      // Assuming this endpoint returns the structure: { students: [...], assessments: [...] }
      const res = await api.get(`/enrollment/offering/${selectedOffering.offering_id}/students-with-grades`);
          
      setAssessments(res.assessments || []);
      setStudentGrades(res.students || []);
      
      if (res.students?.length === 0) {
        toast.info('No students enrolled in this class');
      }
    } catch (error) {
      console.error("Error fetching grades:", error);
      toast.error(error.response?.data?.message || "Failed to load student grades");
    } finally {
      setIsLoadingGrades(false);
    }
  };

  // --- Handlers ---

  const handleSaveGrades = async () => {
    if (!selectedOffering) return;
    setIsSubmitting(true);
    try {
      const payload = {
        offering_id: selectedOffering.offering_id,
        rows: studentGrades.map(student => ({
          student_pk: student.student_pk,
          assessment_scores: student.grades.map(g => ({
            assessment_id: g.assessment_id,
            score: Number(g.score)
          }))
        }))
      };

      await api.post('/grading/grades/bulk', payload);
      toast.success(`Saved ${studentGrades.length} grades successfully.`);
      fetchStudentGrades();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to save grades";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchOfferings();
  }, []);

  const handleScoreChange = (studentPk, assessmentId, newValue) => {
    const normalized = Math.max(0, Math.min(100, Number.isFinite(newValue) ? newValue : 0));
    setStudentGrades(prev => {
      return prev.map(student => {
        if (student.student_pk === studentPk) {
          return {
            ...student,
            grades: student.grades.map(g => 
              g.assessment_id === assessmentId ? { ...g, score: normalized } : g
            )
          };
        }
        return student;
      });
    });
  };

  const gradeScale = [
    { min: 85, max: 100, letter: 'A', status: 'PASSED' },
    { min: 75, max: 84.99, letter: 'B', status: 'PASSED' },
    { min: 65, max: 74.99, letter: 'C', status: 'PASSED' },
    { min: 50, max: 64.99, letter: 'D', status: 'PASSED' },
    { min: 0, max: 49.99, letter: 'F', status: 'FAILED' }
  ];

  const computeGradeSummary = (grades) => {
    const total = assessments.reduce((sum, ass) => {
      const score = Number(grades.find(g => g.assessment_id === ass.assessment_id)?.score || 0);
      const weight = Number(ass.weight || 0);
      return sum + (score * weight) / 100;
    }, 0);

    const match = gradeScale.find(scale => total >= scale.min && total <= scale.max) || gradeScale[gradeScale.length - 1];
    return { total: Number(total.toFixed(2)), letter: match.letter, status: match.status };
  };

  // NEW: Filter Logic
  const filteredStudents = studentGrades.filter(student => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    const fullName = (student.full_name || `${student.first_name || ''} ${student.last_name || ''}`).toLowerCase();
    const studentId = (student.student_id || '').toLowerCase();
    
    return fullName.includes(lowerSearch)  || studentId.includes(lowerSearch);
  });
  return (
    <div className="flex h-full">
      {/* Sidebar: Class List */}
      <div className="w-full md:w-64 border-r border-border-strong bg-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border-strong">
          <h3 className="font-bold text-brand-ml-2 text-xs text-slate-500 uppercase tracking-wider">Classes</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {offerings.map((offering) => (
            <div
              key={offering.offering_id}
              onClick={() => setSelectedOffering(offering)}
              className={`group relative cursor-pointer border rounded-lg p-2 gap-3 transition-colors ${
                selectedOffering?.offering_id === offering.offering_id 
                ? 'bg-brand-blue/10 border-brand-blue' 
                : 'border-transparent hover:bg-surface-muted'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-brand-ink truncate">{offering.module_name || offering.module?.unit_competency}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{offering.batch_code || offering.batch?.batch_code}</div>
                </div>
                <div className="text-xs font-medium text-slate-500">{offering.section_code}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {!selectedOffering ? (
        <div className="flex-1 flex flex-col items-center justify-center h-full text-slate-400">
          <GraduationCap className="w-16 h-16 text-slate-300 mb-4" />
          <h2 className="text-lg font-bold text-slate-700">Select a class to start grading</h2>
          <p className="text-slate-500 text-sm">Choose a class from the sidebar to view the grade sheet.</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 p-4 bg-white border-b border-border-strong">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-brand-ink truncate">{selectedOffering.module_name || selectedOffering.module?.unit_competency}</h2>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-brand-yellow/20 text-brand-blue font-bold">
                  {selectedOffering.batch?.batch_code || selectedOffering.batch_code}
                </span>
                <span>•</span>
                <span className="text-slate-500">{selectedOffering.section_code}</span>
              </div>
            </div>

            {/* NEW: Search Bar & Actions */}
            <div className="flex flex-1 justify-end gap-2 items-center w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search student name or ID..."
                  className="pl-9 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              
              <Button 
                onClick={handleSaveGrades} 
                disabled={isSubmitting}
                className="bg-brand-blue text-white hover:bg-brand-blue/90 whitespace-nowrap"
              >
                <Save size={16} className="mr-2" />
                Save Grades
              </Button>
            </div>
          </div>

          {/* Data Grid */}
          <div className="flex-1 overflow-auto p-4 bg-surface-muted/20">
            <div className="bg-white rounded-xl shadow-sm border border-border-strong overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-border-strong">
                  <tr>
                    <th className="w-64 p-4 text-left font-bold text-slate-500">Student Info</th>
                    {assessments.map(ass => (
                      <th key={ass.assessment_id} className="p-4 text-center min-w-[100px]">
                        <div className="font-bold text-slate-700">{ass.name}</div>
                        <div className="text-xs text-slate-400 font-mono">{ass.weight}%</div>
                      </th>
                    ))}
                    <th className="p-4 text-center min-w-[90px]">Total</th>
                    <th className="p-4 text-center min-w-[70px]">Grade</th>
                    <th className="p-4 text-center min-w-[90px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingGrades ? (
                    <tr>
                      <td colSpan={5 + assessments.length} className="p-8 text-center text-slate-400">
                        Loading enrolled students...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={4 + assessments.length} className="p-8 text-center text-slate-400">
                        {searchTerm ? 'No students found matching your search.' : 'No students found.'}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      const summary = computeGradeSummary(student.grades || []);
                      return (
                      <tr key={student.student_pk} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-brand-yellow/10 text-brand-yellow flex items-center justify-center font-bold text-xs">
                              {student.full_name?.charAt(0) || student.first_name?.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-brand-ink">
                                {student.full_name || `${student.first_name} ${student.last_name}`}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {student.id_number || student.student_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Score Inputs */}
                        {assessments.map(ass => {
                          const grade = student.grades?.find(g => g.assessment_id === ass.assessment_id);
                          const score = grade ? grade.score : '';
                          return (
                            <td key={ass.assessment_id} className="p-2 text-center">
                              <Input
                                type="number"
                                className="w-20 text-center border-border-strong focus:ring-1 focus:ring-brand-blue"
                                placeholder="-"
                                value={score}
                                onChange={(e) => {
                                  const val = e.target.value ? parseFloat(e.target.value) : '';
                                  handleScoreChange(student.student_pk, ass.assessment_id, val);
                                }}
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 text-center font-semibold text-slate-700">
                          {summary.total}
                        </td>
                        <td className="p-2 text-center text-xs font-bold">
                          {summary.letter}
                        </td>
                        <td className="p-2 text-center text-xs font-bold">
                          {summary.status}
                        </td>
                      </tr>
                    )})
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}