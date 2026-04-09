import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { X, User, Mail, Shield, Phone, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export  function StaffFormModal({ open, onClose, onSuccess, selectedStaff = null }) {
  const isEdit = !!selectedStaff;
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '', middle_name: '', last_name: '',
    gender: '', email: '', phone: '',
    staff_type: 'ADMIN', employment_status: 'ACTIVE',
    create_account: false,
    account: { email: '', password: '', role_codes: ['STAFF'] }
  });

  useEffect(() => {
    if (isEdit && selectedStaff) {
      setFormData({
        ...selectedStaff,
        create_account: false // Usually don't recreate account on update
      });
    } else {
      setFormData({
        first_name: '', middle_name: '', last_name: '',
        gender: '', email: '', phone: '',
        staff_type: 'ADMIN', employment_status: 'ACTIVE',
        create_account: false,
        account: { email: '', password: '', role_codes: ['STAFF'] }
      });
    }
  }, [selectedStaff, isEdit, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      if (!formData.create_account) delete payload.account;

      if (isEdit) {
        await api.put(`/staff/${selectedStaff.staff_id}`, payload);
        toast.success("Staff updated successfully");
      } else {
        await api.post('/staff', payload);
        toast.success("Staff created successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 backdrop-blur-sm p-4">
      <div className="bg-brand-surface w-full max-w-2xl rounded-xl shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border-strong flex justify-between items-center sticky top-0 bg-brand-surface z-10">
          <h2 className="text-xl font-bold text-primary">
            {isEdit ? 'Update Staff Member' : 'Register New Staff'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Info Section */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div className="space-y-1">
    <label className="text-xs font-bold first-letter:uppercase text-slate-500">First name</label>
    <Input 
      required
      type="text"
      value={formData.first_name} 
      onChange={e => setFormData({ ...formData, first_name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })} 
    />
  </div>
  <div className="space-y-1">
    <label className="text-xs font-bold first-letter:uppercase text-slate-500">Middle name</label>
    <Input 
      type="text"
      value={formData.middle_name} 
      onChange={e => setFormData({...formData, middle_name: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} 
    />
  </div>
  <div className="space-y-1">
    <label className="text-xs font-bold first-letter:uppercase text-slate-500">Last name</label>
    <Input 
      required 
      type="text"
      value={formData.last_name} 
      onChange={e => setFormData({...formData, last_name: e.target.value.replace(/[^a-zA-Z\s]/g, '')})} 
    />
  </div>
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold first:letter:uppercase text-slate-500 text-flex items-center gap-2">
                <Briefcase className="w-3 h-3"/> Staff Type
              </label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-border-strong text-sm focus:ring-2 focus:ring-primary outline-none first:letter:uppercase"
                value={formData.staff_type}
                onChange={e => setFormData({...formData, staff_type: e.target.value})}
              >
                {['Admin', 'Registrar', 'Staff', 'QA'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-slate-500">Gender</label>
              <select 
                className="w-full h-10 px-3 rounded-md border border-border-strong text-sm focus:ring-2 focus:ring-primary outline-none"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold first:letter:uppercase text-slate-500">Email Address</label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
<div className="space-y-1">
  <label className="text-xs font-bold first-letter:uppercase text-slate-500">Phone number</label>
  <div className="relative flex items-center">
    <span className="absolute left-3 text-sm font-bold text-slate-400 border-r border-border-strong pr-2">
      +251
    </span>
    <Input 
      placeholder="923359252" 
      className="pl-16" // Add padding to accommodate the +251 prefix
      value={formData.phone?.replace('+251', '') || ''} 
      maxLength={9} 
      onChange={(e) => {
        const val = e.target.value.replace(/\D/g, ""); // Allow only digits
        // Store as +251XXXXXXXXX in the state so it's ready for the backend
        setFormData({ ...formData, phone: val ? `+251${val}` : '' });
      }} 
    />
  </div>
</div>
          </div>

          {/* Account Creation Section (Only for new staff) */}
          {!isEdit && (
            <div className="p-4 bg-surface-muted rounded-lg border border-border-strong space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="create_acc"
                  checked={formData.create_account}
                  onChange={e => setFormData({...formData, create_account: e.target.checked})}
                />
                <label htmlFor="create_acc" className="text-sm font-bold text-primary">Create System User Account</label>
              </div>

              {formData.create_account && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                  <Input 
                    placeholder="Login Email" 
                    value={formData.account.email}
                    onChange={e => setFormData({...formData, account: {...formData.account, email: e.target.value}})}
                  />
                 <div className="relative">
  <Input 
    type={showPassword ? "text" : "password"} 
    placeholder="Password" 
    value={formData.account.password}
    onChange={e => setFormData({...formData, account: {...formData.account, password: e.target.value}})}
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary"
  >
    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
</div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-strong">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:opacity-90">
              {loading ? 'Processing...' : isEdit ? 'Update Details' : 'Register Staff'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}