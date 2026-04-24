import React, { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import { Button } from '../../ui/button';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ApprovalWorkflow({ offeringId }) {
  const [status, setStatus] = useState('DRAFT'); // DRAFT, SUBMITTED, APPROVED, REJECTED
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // In a real app, fetch submission status for this offering
    // setStatus(currentStatus);
  }, [offeringId]);

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to lock these grades and submit for approval?")) return;
    setLoading(true);
    try {
      await api.post('/grading/submissions/submit', { offering_id: offeringId });
      setStatus('SUBMITTED');
      toast.success("Grades submitted for approval");
    } catch (error) {
      toast.error(error.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Mock ID for submission, usually fetched first
      await api.put(`/grading/submissions/1/approve`, { status: 'APPROVED', role: 'DEAN' });
      setStatus('APPROVED');
      toast.success("Grades Approved");
    } catch (error) {
      toast.error("Approval failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-border-strong shadow-panel text-center space-y-6">
      <div>
        <h3 className="text-xl font-bold text-brand-ink mb-2">Grade Submission Status</h3>
        <p className="text-slate-500">Current workflow state for this class offering.</p>
      </div>

      <div className="flex justify-center">
        {status === 'DRAFT' && (
          <div className="flex items-center gap-3 px-6 py-3 bg-slate-100 rounded-full text-slate-600">
            <Clock size={20} /> <span className="font-bold">Draft Mode</span>
          </div>
        )}
        {status === 'SUBMITTED' && (
          <div className="flex items-center gap-3 px-6 py-3 bg-yellow-100 rounded-full text-yellow-700">
            <Clock size={20} /> <span className="font-bold">Pending Approval</span>
          </div>
        )}
        {status === 'APPROVED' && (
          <div className="flex items-center gap-3 px-6 py-3 bg-green-100 rounded-full text-green-700">
            <CheckCircle size={20} /> <span className="font-bold">Approved & Final</span>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-4 pt-4 border-t border-border-strong">
        {status === 'DRAFT' && (
          <Button onClick={handleSubmit} disabled={loading} className="bg-brand-blue text-white">
            Submit for Approval
          </Button>
        )}
        {status === 'SUBMITTED' && (
          <Button onClick={handleApprove} disabled={loading} className="bg-green-600 text-white">
            <CheckCircle size={16} className="mr-2" /> Approve Grades
          </Button>
        )}
      </div>
    </div>
  );
}