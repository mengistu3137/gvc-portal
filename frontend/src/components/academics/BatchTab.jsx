import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DeleteConfirmCard } from  '../../components/ui/DeleteConfirmCard';
import { UniversalFormModal } from  '../modals/UniversalFormModal';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function BatchTab() {
  const [data, setData] = useState([]);
  const [occupations, setOccupations] = useState([]);
  const [levels, setLevels] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Helper to fetch levels based on occupation selection (simplified here to fetch all for now)
  const fetchLevelsForOccupation = async (occId) => {
    try {
      const res = await api.get('/academics/levels', { params: { occupation_id: occId } });
      return (res.data || []).map(l => ({ value: l.level_id, label: `Level ${l.level_id}` }));
    } catch (error) { return []; }
  };

  // Dynamic schema
  const getSchema = (occOpts, lvlOpts, yearOpts) => [
    { name: 'batch_code', label: 'Batch Code', type: 'text', required: true },
    { name: 'occupation_id', label: 'Occupation', type: 'select', required: true, options: occOpts, fullWidth: true },
    { name: 'level_id', label: 'Level', type: 'select', required: true, options: lvlOpts, fullWidth: true },
    { name: 'academic_year_id', label: 'Academic Year', type: 'select', required: true, options: yearOpts, fullWidth: true },
    { name: 'max_capacity', label: 'Max Capacity', type: 'number', fullWidth: true }
  ];

  useEffect(() => { 
    fetchData(); 
    fetchAcademicYears(); 
    fetchOccupations(); 
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academics/batches', { params: { search: searchTerm, limit: 50 } });
      setData(res.rows || []);
    } catch (error) { toast.error("Failed to load batches"); } finally { setLoading(false); }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/academics/academic-years');
      setAcademicYears((res.data || []).map(y => ({ value: y.academic_year_id, label: `${y.year_name} (${y.start_date?.split('-')[0]})` })));
    } catch (error) { console.error(error); }
  };

  const fetchOccupations = async () => {
    try {
      const res = await api.get('/academics/occupations/public');
      setOccupations((res.rows || []).map(o => ({ value: o.occupation_id, label: o.occupation_name })));
    } catch (error) { console.error(error); }
  };

  // If editing, fetch levels for that specific occupation
  useEffect(() => {
    if (selectedItem) {
      fetchLevelsForOccupation(selectedItem.occupation_id).then(setLevels);
    } else {
      setLevels([]);
    }
  }, [selectedItem]);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (selectedItem) await api.put(`/academics/batches/${selectedItem.batch_id}`, formData);
      else await api.post('/academics/batches', formData);
      toast.success("Batch saved");
      setFormOpen(false);
      fetchData();
    } catch (error) { toast.error(error.response?.data?.message || "Failed"); } finally { setIsSubmitting(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/academics/batches/${deleteId}`); toast.success("Deleted"); setDeleteId(null); fetchData(); } 
    catch (error) { toast.error("Failed"); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search batches..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <Button onClick={() => { setSelectedItem(null); setLevels([]); setFormOpen(true); }} className="bg-brand-blue text-white hover:bg-opacity-90"><Plus className="mr-2 h-4 w-4" /> New Batch</Button>
      </div>
      <div className="bg-brand-surface rounded-xl border border-border-strong shadow-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-muted border-b border-border-strong"><tr><th className="p-4 text-xs font-bold text-primary uppercase">Batch Code</th><th className="p-4 text-xs font-bold text-primary uppercase">Program</th><th className="p-4 text-xs font-bold text-primary uppercase">Level</th><th className="p-4 text-xs font-bold text-primary uppercase">Academic Year</th><th className="p-4 text-right text-xs font-bold text-primary uppercase">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="5" className="p-8 text-center animate-pulse">Loading...</td></tr> : 
            data.map(item => (
              <tr key={item.batch_id} className="hover:bg-surface-muted/50">
                <td className="p-4 font-medium text-brand-ink flex items-center gap-2"><Users size={16} className="text-brand-blue" />{item.batch_code}</td>
                <td className="p-4 text-sm text-slate-700">{item.occupation?.occupation_name || 'N/A'}</td>
                <td className="p-4 text-sm text-slate-600">Level {item.level?.level_id || 'N/A'}</td>
                <td className="p-4 text-sm text-slate-600">{item.academic_year?.year_name || 'N/A'}</td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setFormOpen(true); }}><Edit size={16} className="text-primary"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.batch_id)}><Trash2 size={16} className="text-red-500"/></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <UniversalFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} schema={getSchema(occupations, levels, academicYears)} initialData={selectedItem} title="Batch" isLoading={isSubmitting} />
      {deleteId && <DeleteConfirmCard open={!!deleteId} loading={deleting} title="Delete Batch?" onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
    </div>
  );
}