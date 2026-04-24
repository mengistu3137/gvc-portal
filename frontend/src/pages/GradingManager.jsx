import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { FileSpreadsheet, RefreshCw, ListTree, GraduationCap, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { GradeEntryTab } from '../components/grading/GradeEntryTab';
import { ApprovalsTab } from '../components/grading/ApprovalsTab';

export  function GradingManager() {
  const [activeTab, setActiveTab] = useState('entry'); 
  const [showCreateOfferingModal, setShowCreateOffering] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // --- Handlers ---
  const refreshData = () => {
    // Trigger refresh in children or call global refresh logic
    if (activeTab === 'approvals') {
      // Trigger child refresh
    }
  };

  const handleDeleteGrade = async (studentPk, resultId) => {
    setDeleteId(studentPk); // Passing Student PK as the ID to delete
  };

  const confirmDelete = async () => {
    // Call API to delete grade record
    setDeleteId(null);
  };

  return (
    <div className="p-6 space-y-6 bg-brand-background min-h-screen">
      {/* Header */}
      <div className="flex flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Grading Manager</h1>
          <p className="text-slate-500 text-sm font-medium">Manage assessments, grades, and approvals.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateOfferingModal(true)}><Plus className="w-4 h-4 mr-2" /> New Class</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-brand-surface border border-border-strong rounded-xl overflow-hidden">
        {/* Tab List */}
        <div className="flex border-b border-border-strong">
          <button
            onClick={() => setActiveTab('entry')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 border-transparent hover:bg-surface-muted transition-colors ${
              activeTab === 'entry' 
                ? 'border-brand-blue text-brand-blue' 
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Grade Entry
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex-1 text-sm font-medium border-b-2 border-transparent hover:bg-surface-muted transition-colors ${
              activeTab === 'approvals' 
                ? 'border-brand-blue text-brand-blue' 
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            Approvals
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'entry' && (
            <GradeEntryTab 
              refreshData={refreshData}
              handleDelete={handleDeleteGrade}
            />
          )}
          
          {activeTab === 'approvals' && (
            <ApprovalsTab refreshData={() => { /* Logic to refresh approvals */ }} />
          )}
        </div>
      </div>
    </div>
  );
}