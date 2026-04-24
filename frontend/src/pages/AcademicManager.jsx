import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Building2, Search, Plus, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AcademicDrawer } from '../components/academics/AcademicDrawer';
import { UniversalFormModal } from '../components/modals/UniversalFormModal';

export function AcademicManager() {
  const [data, setData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedOccupation, setSelectedOccupation] = useState(null);
  
  // Modal State
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Single Data Fetch Effect ---
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Fetch Occupations (for the grid)
        const occRes = await api.get('/academics/occupations', { params: { search: searchTerm, limit: 50 } });
        setData(occRes.rows || []);

        // Fetch Sectors (for the Create Program Modal)
        const secRes = await api.get('/academics/sectors');
        setSectors((secRes.data || []).map(s => ({ value: s.sector_id, label: s.sector_name })));

      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [searchTerm]); // Re-run when search term changes

  const handleProgramSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await api.post('/academics/occupations', formData);
      toast.success("New program created successfully");
      setShowProgramModal(false);
      
      // Refresh the grid
      const occRes = await api.get('/academics/occupations', { params: { search: searchTerm, limit: 50 } });
      setData(occRes.rows || []);
      
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create program");
    } finally {
      setIsSubmitting(false);
    }
  };

  const programSchema = [
    { name: 'occupation_name', label: 'Program Name', type: 'text', required: true, fullWidth: true },
    { name: 'occupation_code', label: 'Program Code', type: 'text', required: true, uppercase: true },
    { name: 'sector_id', label: 'Sector', type: 'select', required: true, options: sectors, fullWidth: true }
  ];

  const handleProgramClick = (occupation) => {
    setSelectedOccupation(occupation);
    setIsDrawerOpen(true);
  };

  return (
    <div className="p-6 space-y-6 bg-brand-background min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Academic Structure</h1>
          <p className="text-slate-500 text-sm font-medium">Manage programs, curriculum, and batches.</p>
        </div>
        <Button onClick={() => setShowProgramModal(true)} className="bg-brand-blue text-white hover:bg-opacity-90">
          <Plus className="mr-2 h-4 w-4" /> New Program
        </Button>
      </div>

      {/* Filters */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search by program name, code, or sector..."
          className="pl-10 border-border-strong focus:ring-primary"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div className="text-center py-12 text-primary animate-pulse">Loading programs...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-slate-400 border-2 border-dashed border-border-strong rounded-xl">No programs found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((item) => (
            <div
              key={item.occupation_id}
              onClick={() => handleProgramClick(item)}
              className="group bg-brand-surface border border-border-strong rounded-xl p-5 shadow-sm hover:shadow-panel hover:border-brand-blue/40 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <Building2 size={64} className="text-brand-blue" />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-surface-muted px-2 py-0.5 rounded">
                    {item.sector?.sector_name || 'General'}
                  </span>
                  <ChevronRight className="text-slate-300 group-hover:text-brand-blue transition-colors" size={20} />
                </div>
                
                <h3 className="font-bold text-brand-ink text-lg mb-1 group-hover:text-primary transition-colors">
                  {item.occupation_name}
                </h3>
                <p className="text-xs font-mono text-slate-500 mb-3">{item.occupation_code}</p>
                
                <div className="flex gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Active
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      <AcademicDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        occupation={selectedOccupation} 
      />

      {/* Create Program Modal */}
      <UniversalFormModal 
        open={showProgramModal} 
        onClose={() => setShowProgramModal(false)} 
        onSubmit={handleProgramSubmit} 
        schema={programSchema} 
        title="New Academic Program" 
        isLoading={isSubmitting} 
      />
    </div>
  );
}