import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Plus, Save, FileCheck, List } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GradeEntryTab } from '../components/grading/GradeEntryTab';
import { ApprovalsTab } from '../components/grading/ApprovalsTab';
import { UniversalFormModal } from '../components/modals/UniversalFormModal';
import { api } from '../lib/api';

// Schema for creating a new Class (Module Offering)
const offeringSchema = [
  { name: 'module_id', label: 'Module', type: 'select', required: true, fullWidth: true },
  { name: 'batch_id', label: 'Batch', type: 'select', required: true, fullWidth: true },
  { name: 'section_code', label: 'Section Code', type: 'text', required: true, placeholder: 'e.g. A, B' },
  { name: 'instructor_id', label: 'Instructor', type: 'select', required: true, fullWidth: true },
  { name: 'capacity', label: 'Max Capacity', type: 'number', fullWidth: true }
];

export function GradingManager() {
  const [activeTab, setActiveTab] = useState('entry');
  const [showOfferingModal, setShowOfferingModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dummy fetch for dropdowns in the modal (Ideally fetch these on mount)
  const fetchDropdowns = async () => {
     // You would fetch modules, batches, staff here and pass them to the schema
     // For brevity, assuming schema options are passed dynamically or fetched inside modal wrapper
  };

  const handleCreateOffering = async (data) => {
    setIsSubmitting(true);
    try {
      await api.post('/offerings', data);
      toast.success("Class created successfully");
      setShowOfferingModal(false);
      // Refresh list in GradeEntryTab
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create class");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-brand-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Grading Management</h1>
          <p className="text-slate-500 text-sm font-medium">Enter student grades and approve final results.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'entry' && (
            <Button 
              className="bg-brand-blue text-white hover:bg-brand-blue/90" 
              onClick={() => setShowOfferingModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> New Class
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border border-border-strong rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-border-strong bg-surface-muted/30">
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'entry' 
                ? 'border-brand-blue text-brand-blue bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <List size={16} /> Grade Entry
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'approvals' 
                ? 'border-brand-blue text-brand-blue bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCheck size={16} /> Approvals
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-0 min-h-[600px]">
          {activeTab === 'entry' ? (
            <GradeEntryTab key="entry" /> 
          ) : (
            <ApprovalsTab key="approvals" />
          )}
        </div>
      </div>

      {/* Create Offering Modal */}
      <UniversalFormModal
        open={showOfferingModal}
        onClose={() => setShowOfferingModal(false)}
        onSubmit={handleCreateOffering}
        schema={offeringSchema}
        title="Create New Class"
        isLoading={isSubmitting}
      />
    </div>
  );
}