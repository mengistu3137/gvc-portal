import React, { useState, useEffect } from 'react';
import { api } from  '../../lib/api';
import { Button } from  '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DeleteConfirmCard } from  '../../components/ui/DeleteConfirmCard';
import { UniversalFormModal } from '../modals/UniversalFormModal';
import { Plus, Search, Edit, Trash2, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OccupationTab() {
  const [data, setData] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const getSchema = (secOpts) => [
    { name: 'occupation_name', label: 'Occupation Title', type: 'text', required: true, fullWidth: true },
    { name: 'occupation_code', label: 'Occupation Code', type: 'text', required: true, uppercase: true },
    { name: 'sector_id', label: 'Sector', type: 'select', required: true, options: secOpts, fullWidth: true }
  ];

  useEffect(() => { fetchData(); fetchSectors(); }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academics/occupations', { params: { search: searchTerm, limit: 50 } });
      setData(res.rows || []);
    } catch (error) { toast.error("Failed to load occupations"); } finally { setLoading(false); }
  };

  const fetchSectors = async () => {
    try {
      const res = await api.get('/academics/sectors');
      setSectors((res.data || []).map(s => ({ value: s.sector_id, label: s.sector_name })));
    } catch (error) { console.error(error); }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (selectedItem) await api.put(`/academics/occupations/${selectedItem.occupation_id}`, formData);
      else await api.post('/academics/occupations', formData);
      toast.success("Occupation saved");
      setFormOpen(false);
      fetchData();
    } catch (error) { toast.error(error.response?.data?.message || "Failed"); } finally { setIsSubmitting(false); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/academics/occupations/${deleteId}`); toast.success("Deleted"); setDeleteId(null); fetchData(); } 
    catch (error) { toast.error("Failed"); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><Input placeholder="Search occupations..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
        <Button onClick={() => { setSelectedItem(null); setFormOpen(true); }} className="bg-brand-blue text-white hover:bg-opacity-90"><Plus className="mr-2 h-4 w-4" /> New Occupation</Button>
      </div>
      <div className="bg-brand-surface rounded-xl border border-border-strong shadow-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-muted border-b border-border-strong"><tr><th className="p-4 text-xs font-bold text-primary uppercase">Title</th><th className="p-4 text-xs font-bold text-primary uppercase">Code</th><th className="p-4 text-xs font-bold text-primary uppercase">Sector</th><th className="p-4 text-right text-xs font-bold text-primary uppercase">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="4" className="p-8 text-center animate-pulse">Loading...</td></tr> : 
            data.map(item => (
              <tr key={item.occupation_id} className="hover:bg-surface-muted/50">
                <td className="p-4 font-medium text-brand-ink flex items-center gap-2"><Briefcase size={16} className="text-brand-blue" />{item.occupation_name}</td>
                <td className="p-4 text-slate-500 font-mono text-sm">{item.occupation_code}</td>
                <td className="p-4 text-sm text-slate-600">{item.sector?.sector_name || 'N/A'}</td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setFormOpen(true); }}><Edit size={16} className="text-primary"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.occupation_id)}><Trash2 size={16} className="text-red-500"/></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <UniversalFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} schema={getSchema(sectors)} initialData={selectedItem} title="Occupation" isLoading={isSubmitting} />
      {deleteId && <DeleteConfirmCard open={!!deleteId} loading={deleting} title="Delete Occupation?" onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
    </div>
  );
}