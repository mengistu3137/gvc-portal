import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { DeleteConfirmCard } from '../../components/ui/DeleteConfirmCard';
import { UserPlus, Search, Edit, Trash2, Mail, Phone, Lock, Shield, Briefcase, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { UniversalFormModal } from '../../components/modals/UniversalFormModal';

export function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Dropdown Options
  const [roleOptions, setRoleOptions] = useState([]);
  const [occupationOptions, setOccupationOptions] = useState([]);
  
  // Modal States
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Delete states
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Schema Definition aligned with StaffService
  const getStaffSchema = (roles, occupations) => [
    // --- Section 1: Personal Information ---
    { name: 'personal_header', label: 'Personal Information', type: 'divider', fullWidth: true },
    { name: 'first_name', label: 'First name', type: 'text', required: true, isName: true },
    { name: 'middle_name', label: 'Middle name', type: 'text', isName: true },
    { name: 'last_name', label: 'Last name', type: 'text', required: true, isName: true },
    { name: 'phone', label: 'Phone number', type: 'phone', required: true, prefix: '+251', maxLength: 9 },
      { 
      name: 'account.email', 
      label: 'Account Email', 
      type: 'email', 
      required: true, 
      placeholder: 'staff@gvc.edu'
    },
    
    { 
      name: 'account.password', 
      label: 'Password', 
      type: 'password', 
      // Required only for Create. Logic handled in renderField based on isEdit or explicit prop.
      // We pass required: true here, but UniversalFormModal handles the "edit mode" exception if we pass isEdit context, 
      // or we just handle it in validation. For now, we keep it required.
      required: true, 
      placeholder: 'Must be at least 6 characters',
  
    },

    { 
      name: 'account.role_ids', 
      label: 'Assign Roles', 
      type: 'checkbox-group', 
      options: roles, 
      fullWidth: true,
      hint: 'Select all applicable system roles for this user.'
    },
    
    // --- Section 2: Employment Details ---
    { name: 'employment_header', label: 'Employment Details', type: 'divider', fullWidth: true },
    
    { 
      name: 'employment_status', 
      label: 'Status', 
      type: 'select', 
      required: true, 
      defaultValue: 'ACTIVE',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'ON_LEAVE', label: 'On Leave' },
        { value: 'INACTIVE', label: 'Inactive' }
      ]
    },

    { 
      name: 'occupation_id', 
      label: 'Occupation', 
      type: 'select', 
      options: occupations,
      placeholder: 'Select role or title'
    },

    { 
      name: 'hire_date', 
      label: 'Hire Date', 
      type: 'date', 
    },

    { 
      name: 'qualification', 
      label: 'Highest Qualification', 
      type: 'text', 
      placeholder: 'e.g. MSc in Computer Science' 
    },

    { 
      name: 'specializations', 
      label: 'Specializations', 
      type: 'text', 
      fullWidth: true, 
      placeholder: 'Comma separated (e.g. Database, Web Development)' 
    },
    
    // --- Section 3: System Account ---
    
  
  ];

  useEffect(() => {
    fetchStaff();
    fetchRoles();
    fetchOccupations();
  }, [searchTerm]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = { search: searchTerm, limit: 50 };
      const response = await api.get('/staff', { params });
      setStaffList(response.rows || []);
    } catch (error) {
      toast.error("Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.get('/auth/roles'); 
      const roles = response.data || response.roles || [];
      
      const formattedRoles = Array.isArray(roles) ? roles.map(r => ({ 
        value: r.role_code, // Storing code
        label: r.role_name || r.role_code 
      })) : [];
      setRoleOptions(formattedRoles);
    } catch (error) {
      console.error("Failed to fetch roles", error);
      setRoleOptions([]);
    }
  };

  const fetchOccupations = async () => {
    try {
      // Assuming an endpoint exists to fetch occupations.
      // Adjust endpoint if your structure differs (e.g., /academics/occupations)
      const response = await api.get('/academics/occupations'); 
      const occupations = response.data || response.occupations || [];
      
      const formattedOccupations = Array.isArray(occupations) ? occupations.map(o => ({
        value: o.occupation_id,
        label: o.occupation_title || o.name
      })) : [];
      setOccupationOptions(formattedOccupations);
    } catch (error) {
      console.error("Failed to fetch occupations", error);
      setOccupationOptions([]);
    }
  };

  // Unified Submit Handler aligned with StaffService
  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      const isEdit = !!selectedStaff;

      const { account, ...staffFields } = formData;

      // Map UI specific role_ids to backend role_codes
      const accountPayload = {
        ...account,
        role_codes: account.role_ids || []
      };
      delete accountPayload.role_ids; 

      // Backend expects 'specializations' as string or JSON. 
      // Input type 'text' sends string. Service handles JSON stringify if needed.
      
      const finalPayload = {
        ...staffFields,
        account: accountPayload
      };

      if (isEdit) {
        await api.put(`/staff/${selectedStaff.staff_id}`, finalPayload);
      } else {
        await api.post('/staff', finalPayload);
      }

      toast.success(`Staff ${isEdit ? 'updated' : 'created'} successfully`);
      setFormOpen(false);
      fetchStaff();
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || error.message || "Operation failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to pre-fill form data from API response
  const prepareInitialData = (staff) => {
    if (!staff) return null;
    
    return {
      // Personal
      first_name: staff.first_name,
      middle_name: staff.middle_name,
      last_name: staff.last_name,
      phone: staff.phone,
      
      // Employment
      employment_status: staff.employment_status || 'ACTIVE',
      occupation_id: staff.occupation?.occupation_id || staff.occupation_id, // Handle nested or flat ID
      hire_date: staff.hire_date,
      qualification: staff.qualification,
      specializations: Array.isArray(staff.specializations) 
        ? staff.specializations.join(', ') 
        : (staff.specializations || ''),

      // Account
      account: {
        email: staff.account_email,
        password: '', // Never populate password
        role_ids: staff.roles ? staff.roles.map(r => r.role_code) : []
      }
    };
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (Array.isArray(deleteId) && deleteId.length > 0) {
        await Promise.all(deleteId.map(id => api.delete(`/staff/${id}`)));
        toast.success(`${deleteId.length} staff members archived successfully`);
        setSelectedIds([]);
      } else if (deleteId) {
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

  const handleEdit = (staff) => {
    setSelectedStaff(staff);
    setFormOpen(true);
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
              onClick={() => setDeleteId(selectedIds)}
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
            placeholder="Search by name, code, email, or phone..."
            className="pl-10 border-border-strong focus:ring-primary focus:ring-1"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
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
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Contact</th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Employment</th>
              <th className="p-4 text-xs font-bold text-primary first:letter:uppercase tracking-wider">Roles</th>
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
                    <div className="text-sm text-slate-600 flex items-center gap-1"><Mail className="h-3 w-3 text-primary" /> {staff.account_email || 'N/A'}</div>
                    <div className="text-sm text-slate-600 flex items-center gap-1"><Phone className="h-3 w-3 text-primary" /> {staff.phone || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Briefcase className="h-3 w-3 text-slate-400" /> {staff.occupation?.occupation_title || 'General Staff'}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded w-fit
                        ${staff.employment_status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                          staff.employment_status === 'ON_LEAVE' ? 'bg-orange-100 text-orange-700' : 
                          'bg-slate-100 text-slate-600'}`}>
                        {staff.employment_status}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                       {staff.roles && staff.roles.length > 0 ? (
                         staff.roles.slice(0, 2).map(r => (
                           <span key={r.role_code} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-muted border border-border-strong text-slate-600">
                             {r.role_name}
                           </span>
                         ))
                       ) : (
                         <span className="text-xs text-slate-400 italic">No roles</span>
                       )}
                       {staff.roles && staff.roles.length > 2 && (
                         <span className="text-xs text-slate-400">+{staff.roles.length - 2}</span>
                       )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-white"
                        onClick={() => handleEdit(staff)}>
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

      {/* Dynamic Modal */}
      <UniversalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        schema={getStaffSchema(roleOptions, occupationOptions)}
        initialData={prepareInitialData(selectedStaff)}
        title="Staff Member"
        isLoading={isSubmitting}
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