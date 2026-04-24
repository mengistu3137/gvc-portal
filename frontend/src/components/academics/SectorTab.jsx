import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from  '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DeleteConfirmCard } from  '../../components/ui/DeleteConfirmCard';
import { UniversalFormModal } from '../modals/UniversalFormModal';
import { Plus, Search, Edit, Trash2, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SectorTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Schema
  const schema = [
    { name: 'sector_name', label: 'Sector Name', type: 'text', required: true },
    { name: 'sector_code', label: 'Sector Code', type: 'text', required: true, isName: true, uppercase: true }
  ];

  useEffect(() => { fetchData(); }, [searchTerm]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/academics/sectors', { params: { search: searchTerm } });
      setData(res.data || []);
    } catch (error) {
      toast.error("Failed to load sectors");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      if (selectedItem) {
        await api.put(`/academics/sectors/${selectedItem.sector_id}`, formData);
        toast.success("Sector updated");
      } else {
        await api.post('/academics/sectors', formData);
        toast.success("Sector created");
      }
      setFormOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/academics/sectors/${deleteId}`);
      toast.success("Sector deleted");
      setDeleteId(null);
      fetchData();
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="Search sectors..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Button onClick={() => { setSelectedItem(null); setFormOpen(true); }} className="bg-brand-blue text-white hover:bg-opacity-90">
          <Plus className="mr-2 h-4 w-4" /> New Sector
        </Button>
      </div>

      <div className="bg-brand-surface rounded-xl border border-border-strong shadow-panel overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface-muted border-b border-border-strong">
            <tr>
              <th className="p-4 text-xs font-bold text-primary uppercase">Name</th>
              <th className="p-4 text-xs font-bold text-primary uppercase">Code</th>
              <th className="p-4 text-right text-xs font-bold text-primary uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan="3" className="p-8 text-center text-primary animate-pulse">Loading...</td></tr> : 
            data.length === 0 ? <tr><td colSpan="3" className="p-8 text-center text-slate-400">No sectors found.</td></tr> :
            data.map(item => (
              <tr key={item.sector_id} className="hover:bg-surface-muted/50 transition-colors">
                <td className="p-4 font-medium text-brand-ink flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-brand-blue/10 text-brand-blue flex items-center justify-center"><Building2 size={16}/></div>
                  {item.sector_name}
                </td>
                <td className="p-4 text-slate-500 font-mono text-sm">{item.sector_code}</td>
                <td className="p-4 text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(item); setFormOpen(true); }}><Edit size={16} className="text-primary"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.sector_id)}><Trash2 size={16} className="text-red-500"/></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UniversalFormModal open={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleSubmit} schema={schema} initialData={selectedItem} title="Sector" isLoading={isSubmitting} />
      
      {deleteId && <DeleteConfirmCard open={!!deleteId} loading={deleting} title="Delete Sector?" description="This action cannot be undone." onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
    </div>
  );
}