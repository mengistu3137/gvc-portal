import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { CheckCircle, Search, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'react-hot-toast';

// Status Badge Component
const StatusBadge = ({ status }) => {
  const styles = {
    SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
    APPROVED: 'bg-green-100 text-green-700 border-green-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  const style = styles[status] || styles.DRAFT;
  
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style}`}>
      {status}
    </span>
  );
};

export  function ApprovalsTab({ refreshData }) {
  const [submissions, setSubmissions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // Track specific submission action
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [rejectComment, setRejectComment] = useState('');

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/grading/submissions', { 
        
        params: { status: filterStatus === 'ALL' ? undefined : filterStatus } 
      });
      setSubmissions(res.payload || []);
    } catch (error) {
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubmissionDetail = async (submission) => {
    if (!submission) return;
    const offeringId = submission.offering?.offering_id || submission.offering_id;
    if (!offeringId) {
      setDetailError('Offering not found for this submission.');
      return;
    }

    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await api.get(`/grading/sheet/${offeringId}`);
      setDetailData(res.payload || null);
    } catch (error) {
      setDetailError(error.message || 'Failed to load submission details');
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetail = (submission) => {
    setSelectedSubmission(submission);
    setDetailData(null);
    setRejectComment('');
    setDetailOpen(true);
    fetchSubmissionDetail(submission);
  };

  const handleApproval = async (submissionId, action) => {
    if (action === 'REJECTED' && !rejectComment.trim()) {
      toast.error('Rejection comment is required');
      return;
    }

    setActionLoading(submissionId);
    try {
      // Determine Role based on user logic (Mocked here as 'REGISTRAR')
      const userRole = 'REGISTRAR'; 
      
      await api.put(`/grading/submissions/${submissionId}/approve`, {
        status: action, // 'APPROVED' or 'REJECTED'
        role: userRole,
        note: action === 'REJECTED' ? rejectComment.trim() : undefined
      });
      
      toast.success(`Submission ${action} successfully`);
      fetchSubmissions();
      if (refreshData) refreshData();
    } catch (error) {
      const msg = error.response?.data?.message || "Action failed";
      toast.error(msg);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const instructor = (sub.instructor?.user?.full_name || '').toLowerCase();
    const module = (sub.offering?.module?.m_code || '').toLowerCase();
    const batch = (sub.offering?.batch?.batch_code || '').toLowerCase();
    return instructor.includes(term) || module.includes(term) || batch.includes(term);
  });

  useEffect(() => { fetchSubmissions(); }, [filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-lg font-bold text-slate-800">Pending Approvals</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <select
            className="h-9 px-3 rounded-md border border-border-strong text-sm bg-white"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="DRAFT">Draft</option>
          </select>
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search module, batch, or instructor..." 
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchSubmissions} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><RefreshCw className="animate-spin text-slate-400" /></div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            No submissions found.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredSubmissions.map((sub) => (
              <div key={sub.submission_id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex gap-4 items-start">
                    <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                      {sub.instructor?.user?.full_name?.charAt(0) || 'IN'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{sub.instructor?.user?.full_name || 'Unknown Instructor'}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">{sub.offering?.module?.name || 'Module'}</span>
                        <span className="mx-1 text-slate-300">•</span>
                        <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {sub.offering?.batch?.batch_code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Submitted: {new Date(sub.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 self-start sm:self-center">
                    <StatusBadge status={sub.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetail(sub)}
                    >
                      View
                    </Button>
                    {sub.status === 'SUBMITTED' && (
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleApproval(sub.submission_id, 'REJECTED')}
                          disabled={actionLoading === sub.submission_id}
                        >
                          <XCircle size={16} className="mr-1" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproval(sub.submission_id, 'APPROVED')}
                          disabled={actionLoading === sub.submission_id}
                        >
                          {actionLoading === sub.submission_id ? <RefreshCw size={14} className="animate-spin" /> : <><CheckCircle size={16} className="mr-1" /> Approve</>}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-panel max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border-strong flex items-center justify-between">
              <div>
                <div className="text-lg font-bold text-brand-ink">Submission Detail</div>
                <div className="text-xs text-slate-500">
                  {selectedSubmission?.offering?.module?.m_code || 'Module'} • {selectedSubmission?.offering?.batch?.batch_code || 'Batch'}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>Close</Button>
            </div>

            <div className="p-4 space-y-4">
              {detailLoading && (
                <div className="text-center text-slate-400 py-8">Loading submission details...</div>
              )}

              {!detailLoading && detailError && (
                <div className="text-center text-red-500 py-8">{detailError}</div>
              )}

              {!detailLoading && !detailError && detailData && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Instructor</div>
                      <div className="font-semibold text-slate-800">
                        {selectedSubmission?.instructor?.user?.full_name || 'Unknown'}
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Submission Status</div>
                      <div className="font-semibold text-slate-800">{selectedSubmission?.status || 'UNKNOWN'}</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <div className="text-xs text-slate-500">Submitted</div>
                      <div className="font-semibold text-slate-800">
                        {selectedSubmission?.created_at ? new Date(selectedSubmission.created_at).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-700 mb-2">Assessments</div>
                    {detailData.assessments?.length ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {detailData.assessments.map(ass => (
                          <div key={ass.assessment_id} className="border border-slate-200 rounded-lg p-2">
                            <div className="text-xs text-slate-500">{ass.name}</div>
                            <div className="text-sm font-semibold text-slate-800">{ass.weight}%</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">No assessments found.</div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-700 mb-2">Students</div>
                    {detailData.students?.length ? (
                      <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="p-2 text-left">Student</th>
                              <th className="p-2 text-left">ID</th>
                              <th className="p-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {detailData.students.map(student => (
                              <tr key={student.student_pk}>
                                <td className="p-2">{student.full_name || 'Unknown'}</td>
                                <td className="p-2 text-xs text-slate-500">{student.student_id}</td>
                                <td className="p-2 text-xs">{student.enrollment_status || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400">No students found.</div>
                    )}
                  </div>

                  {selectedSubmission?.status === 'SUBMITTED' && (
                    <div className="border-t border-slate-200 pt-4 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500">Rejection Comment (required to reject)</label>
                        <Input
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          placeholder="Provide rejection reason"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50"
                          onClick={() => handleApproval(selectedSubmission.submission_id, 'REJECTED')}
                          disabled={actionLoading === selectedSubmission.submission_id}
                        >
                          Reject
                        </Button>
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproval(selectedSubmission.submission_id, 'APPROVED')}
                          disabled={actionLoading === selectedSubmission.submission_id}
                        >
                          Approve
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}