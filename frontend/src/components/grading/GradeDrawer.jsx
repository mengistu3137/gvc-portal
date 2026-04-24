import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Layers, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { toast } from 'react-hot-toast';
import { GradebookGrid } from './GradebookGrid'; // Reusing the grid from previous step
import { AssessmentManager } from './AssessmentManager';

export function GradeDrawer({ isOpen, onClose, offering }) {
  const [activeTab, setActiveTab] = useState('gradebook');
  const [submissionStatus, setSubmissionStatus] = useState('DRAFT'); // DRAFT, SUBMITTED, APPROVED
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Reset tab when opening new offering
  useEffect(() => {
    if (isOpen) setActiveTab('gradebook');
  }, [isOpen, offering?.offering_id]);

  // Mock fetching submission status (Replace with real API call)
  useEffect(() => {
    if (isOpen && offering) {
      // In real app: api.get(`/grading/submissions/status?offering_id=${offering.offering_id}`)
      setSubmissionStatus('DRAFT'); 
    }
  }, [isOpen, offering]);

  if (!isOpen || !offering) return null;

  const handleSubmitGrades = async () => {
    if (!confirm("Are you sure? This will lock grades for review.")) return;
    setLoadingStatus(true);
    try {
      await api.post('/grading/submissions/submit', { offering_id: offering.offering_id });
      setSubmissionStatus('SUBMITTED');
      toast.success("Submitted successfully");
    } catch (error) {
      toast.error("Submission failed");
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleApprove = async () => {
    setLoadingStatus(true);
    try {
      // Mock approve
      setSubmissionStatus('APPROVED');
      toast.success("Grades approved");
    } catch (error) {
      toast.error("Approval failed");
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[90vw] lg:w-[1200px] bg-brand-background shadow-2xl border-l border-border-strong flex flex-col animate-in slide-in-from-right duration-300">
      
      {/* Drawer Header */}
      <div className="bg-white border-b border-border-strong p-6 flex justify-between items-start shadow-sm z-10">
        <div className="flex-1 pr-8">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-brand-ink">{offering.module?.unit_competency}</h2>
            <span className="px-2 py-0.5 rounded bg-surface-muted text-[10px] font-bold text-slate-500 uppercase">
              {offering.module?.m_code}
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Batch:</span>
              <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{offering.batch?.batch_code}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Section:</span>
              <span className="bg-slate-100 px-2 py-1 rounded text-xs font-mono">{offering.section_code}</span>
            </div>
            {/* Status Badge */}
            <div className="ml-auto flex items-center gap-2">
              {submissionStatus === 'DRAFT' && (
                <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                  <AlertTriangle size={12} /> Draft
                </span>
              )}
              {submissionStatus === 'SUBMITTED' && (
                <span className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                  <FileText size={12} /> Pending Review
                </span>
              )}
              {submissionStatus === 'APPROVED' && (
                <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                  <CheckCircle size={12} /> Finalized
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-full">
          <X size={28} />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col bg-slate-50/50">
          
          {/* Tab Navigation */}
          <div className="bg-white border-b border-border-strong px-6 pt-4">
            <TabsList className="bg-surface-muted p-1 w-auto inline-flex">
              <TabsTrigger value="gradebook" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Save size={16} className="mr-2" /> Gradebook
              </TabsTrigger>
              <TabsTrigger value="assessments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Layers size={16} className="mr-2" /> Assessments
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content Areas */}
          <div className="flex-1 overflow-hidden p-6">
            <TabsContent value="gradebook" className="h-full m-0 p-0">
              <GradebookGrid offeringId={offering.offering_id} isReadOnly={submissionStatus !== 'DRAFT'} />
            </TabsContent>

            <TabsContent value="assessments" className="h-full m-0 p-0">
              <AssessmentManager offeringId={offering.offering_id} isReadOnly={submissionStatus !== 'DRAFT'} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Drawer Footer (Actions) */}
      {submissionStatus === 'DRAFT' && (
        <div className="bg-white border-t border-border-strong p-4 flex justify-end gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleSubmitGrades} disabled={loadingStatus} className="bg-brand-blue text-white hover:bg-brand-blue/90">
            {loadingStatus ? 'Submitting...' : 'Submit for Approval'}
          </Button>
        </div>
      )}

      {submissionStatus === 'SUBMITTED' && (
        <div className="bg-white border-t border-border-strong p-4 flex justify-end gap-3">
          <div className="text-sm text-slate-500 italic mr-auto flex items-center">
            Grades are currently under review.
          </div>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {/* In a real app, this button only shows for Deans/Admins */}
          <Button onClick={handleApprove} disabled={loadingStatus} className="bg-green-600 text-white hover:bg-green-700">
            {loadingStatus ? 'Approving...' : 'Approve Grades'}
          </Button>
        </div>
      )}
      
      {submissionStatus === 'APPROVED' && (
        <div className="bg-green-50 border-t border-green-200 p-4 flex justify-end items-center">
          <div className="text-green-800 font-bold text-sm flex items-center gap-2 mr-auto">
            <CheckCircle size={16} /> Grades are finalized and published.
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      )}

    </div>
  );
}