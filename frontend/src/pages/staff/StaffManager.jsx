import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DeleteConfirmCard } from '../../components/ui/DeleteConfirmCard';
import { UserPlus, Search, Edit, Trash2, Mail, Phone, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UniversalFormModal } from '../../components/modals/UniversalFormModal';

export function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Unified Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  
  // Delete states
  const [deleteId, setDeleteId] = useState(null); // can be number (single) or array (bulk)
  const [deleting, setDeleting] = useState(false);

  const staffSchema = [
    { name: 'first_name', label: 'First name', type: 'text', required: true, isName: true },
    { name: 'middle_name', label: 'Middle name', type: 'text', isName: true },
    { name: 'last_name', label: 'Last name', type: 'text', required: true, isName: true },
    {
      name: 'staff_type', label: 'Staff role', type: 'select', required: true,
      options: [
        { label: 'Staff', value: 'STAFF' },
        { label: 'Admin', value: 'ADMIN' },
        { label: 'Registrar', value: 'REGISTRAR' },
        { label: 'QA', value: 'QA' },
        { label: 'Finance', value: 'FINANCE' }
      ]
    },
    { name: 'phone', label: 'Phone number', type: 'phone' },
    { name: 'email', label: 'Email address', type: 'email' },
    { name: 'account', label: 'System Account' }
  ];

  useEffect(() => {
    fetchStaff();
  }, [searchTerm, filterType]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = { search: searchTerm, staff_type: filterType, limit: 50 };
      const response = await api.get('/staff', { params });
      setStaffList(response.rows || []);
    } catch (error) {
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  // Fixed: handles both single and bulk deletion
  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (Array.isArray(deleteId) && deleteId.length > 0) {
        
        await Promise.all(deleteId.map(id => api.delete(`/staff/${id}`)));
        toast.success(`${deleteId.length} staff members archived successfully`);
        setSelectedIds([]); // clear checkboxes after bulk delete
      } else if (deleteId) {
        // Single delete
        await api.delete(`/staff/${deleteId}`);
        toast.success("Staff archived successfully");
      }
      fetchStaff();
      setDeleteId(null);
    } catch (error) {
      toast.error(Array.isArray(deleteId) ? "Bulk delete failed" : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Staff Management</h1>
          <p className="text-slate-500 text-sm font-medium">Manage administrative and support personnel.</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button
              onClick={() => setDeleteId(selectedIds)} // Pass array for bulk delete
              className="bg-red-500 text-white border border-red-500 hover:bg-red-600 focus:ring-red-500 items-center flex"
            >
              <Trash2 className="mr-2 h-4 w-4" /> ({selectedIds.length})
            </Button>
          )}
          <Button
            onClick={() => { setSelectedStaff(null); setFormOpen(true); }}
            className="flex items-center bg-brand-blue text-brand-ink font-bold hover:opacity-90"
          >
            <UserPlus className="mr-2 h-4 w-4" />New Staff
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-surface p-4 rounded-xl border border-border-strong shadow-sm flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name, code, or email..."
            className="pl-10 border-border-strong focus:ring-primary focus:ring-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border border-border-strong rounded-md px-3 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">All Staff Types</option>
          <option value="STAFF">Staff</option>
          <option value="FINANCE">Finance</option>
          <option value="REGISTRAR">Registrar</option>
          <option value="ADMIN">Administration</option>
          <option value="QA">Quality Assurance</option>
        </select>
      </div>

      {/* Staff Table */}
      <div className="bg-brand-surface rounded-xl border border-border-strong shadow-panel overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-muted border-b border-border-strong">
            <tr>
              <th className="p-4 w-10">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(staffList.map(s => s.staff_id));
                    else setSelectedIds([]);
                  }}
                  checked={selectedIds.length === staffList.length && staffList.length > 0}
                />
              </th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Staff Detail</th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Type</th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Contact</th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Status</th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="p-12 text-center text-primary font-bold animate-pulse">Synchronizing records...</td></tr>
            ) : staffList.length === 0 ? (
              <tr><td colSpan="6" className="p-12 text-center text-slate-400">No staff found matching criteria.</td></tr>
            ) : (
              staffList.map((staff) => (
                <tr key={staff.staff_id} className={selectedIds.includes(staff.staff_id) ? 'bg-blue-50/30' : ''}>
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(staff.staff_id)}
                      onChange={() => {
                        setSelectedIds(prev =>
                          prev.includes(staff.staff_id)
                            ? prev.filter(id => id !== staff.staff_id)
                            : [...prev, staff.staff_id]
                        );
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary text-white flex items-center justify-center font-black">
                        {staff.first_name?.[0]}{staff.last_name?.[0]}
                      </div>
                      <div>
                        <div className="font-bold text-brand-ink">{staff.full_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{staff.staff_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white border border-border-strong text-primary uppercase">
                      {staff.staff_type}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3 text-primary" /> {staff.email || 'N/A'}</div>
                    <div className="text-sm text-slate-600 flex items-center gap-1"><Phone className="h-3 w-3 text-primary" /> {staff.phone || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${staff.account_status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-400'}`} />
                      <span className="text-xs font-bold text-slate-700 uppercase">{staff.account_status || 'NO ACCOUNT'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-white"
                        onClick={() => { setSelectedStaff(staff); setFormOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-white"
                        onClick={() => setDeleteId(staff.staff_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dynamic Modal for Create/Update */}
      <UniversalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={fetchStaff}
        title="Staff Member"
        endpoint="/staff"
        schema={staffSchema}
        initialData={selectedStaff}
      />

      {/* Delete Confirmation Overlay */}
      {deleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md shadow-2xl">
            <DeleteConfirmCard
              open={!!deleteId}
              loading={deleting}
              title={Array.isArray(deleteId) ? `Archive ${deleteId.length} Records?` : "Archive Staff Record?"}
              description="This will move the selected personnel to inactive status."
              onCancel={() => setDeleteId(null)}
              onConfirm={confirmDelete}
            />
          </div>
        </div>
      )}
    </div>
  );
}