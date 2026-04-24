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

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/grading/submissions', { 
        
        params: { status: filterStatus === 'ALL' ? undefined : filterStatus } 
      });
        console.log("submissiion",res)
      setSubmissions(res.payload || []);
    } catch (error) {
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (submissionId, action) => {
    setActionLoading(submissionId);
    try {
      // Determine Role based on user logic (Mocked here as 'REGISTRAR')
      const userRole = 'REGISTRAR'; 
      
      await api.put(`/grading/submissions/${submissionId}/approve`, {
        status: action, // 'APPROVED' or 'REJECTED'
        role: userRole
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
    const instructor = sub.instructor?.user?.full_name || '';
    const module = sub.offering?.module?.m_code || '';
    const batch = sub.offering?.batch?.batch_code || '';
    return instructor.includes(term) || module.includes(term) || batch.includes(term);
  });

  useEffect(() => { fetchSubmissions(); }, [filterStatus]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h3 className="text-lg font-bold text-slate-800">Pending Approvals</h3>
        <div className="flex gap-2 w-full sm:w-auto">
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
    </div>
  );
}