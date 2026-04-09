import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function UniversalFormModal({ 
  open, 
  onClose, 
  onSuccess, 
  schema, 
  initialData = null, 
  title, 
  endpoint 
}) {
  const isEdit = !!initialData;
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({});

 

// Inside UniversalFormModal.jsx
useEffect(() => {
  if (open) {
    const defaultData = {};
    schema.forEach(field => {
      // 1. If we are editing, use existing data
      if (initialData) {
        defaultData[field.name] = initialData[field.name];
      } 
      // 2. If creating AND it's a select field, default to the first option's value
      else if (field.type === 'select' && field.options?.length > 0) {
        defaultData[field.name] = field.options[0].value;
      } 
      // 3. Otherwise use defaultValue or empty string
      else {
        defaultData[field.name] = field.defaultValue || '';
      }
    });

    // Handle account logic
    if (schema.find(f => f.name === 'account')) {
      defaultData.create_account = false;
      defaultData.account = initialData?.account || { email: '', password: '', role_codes: ['STAFF'] };
    }
    setFormData(defaultData);
  }
}, [open, initialData, schema]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData };
      
      if (payload.create_account === false) delete payload.account;
      

      if (isEdit) {
        await api.put(`${endpoint}/${initialData.id || initialData.staff_id}`, payload);
        toast.success("Updated successfully");
      } else {
        await api.post(endpoint, payload);
        toast.success("Created successfully");
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
          <h2 className="text-xl font-bold text-primary">{isEdit ? `Update ${title}` : `New ${title}`}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500"><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.map((field) => {
              if (field.name === 'account') return null; // Handled separately at bottom

              return (
                <div key={field.name} className={`space-y-1 ${field.fullWidth ? 'md:col-span-2' : ''}`}>
                  <label className="text-xs font-bold first-letter:uppercase text-slate-500">
                    {field.label}
                  </label>
                  
                  {field.type === 'select' ? (
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-border-strong text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={formData[field.name] || ''}
                      onChange={e => setFormData({...formData, [field.name]: e.target.value})}
                    >
                      {field.options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'phone' ? (
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-sm font-bold text-slate-400 border-r border-border-strong pr-2">+251</span>
                      <Input 
                        className="pl-16"
                        value={formData[field.name]?.replace('+251', '') || ''}
                        onChange={e => setFormData({...formData, [field.name]: `+251${e.target.value.replace(/\D/g, '')}`})}
                        maxLength={9}
                      />
                    </div>
                  ) : (
                    <Input 
                      type={field.type || 'text'}
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={e => {
                        let val = e.target.value;
                        if (field.isName) val = val.replace(/[^a-zA-Z\s]/g, '');
                        setFormData({...formData, [field.name]: val});
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Specialized Account Section for Staff/Users */}
          {schema.some(f => f.name === 'account') && (!isEdit || !initialData?.account_status || initialData?.account_status === 'NO ACCOUNT')&& (
            <div className="p-4 bg-surface-muted rounded-lg border border-border-strong space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.create_account || false}
                  onChange={e => setFormData({...formData, create_account: e.target.checked})}
                />
                <label className="text-sm font-bold text-primary">Provision System Account</label>
              </div>
             {formData.create_account && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <Input 
      type="email"
      placeholder="Email " 
      required={formData.create_account}
      value={formData.account?.email || ''} // Controlled input
      onChange={e => setFormData({
        ...formData, 
        account: {
          ...formData.account, 
          email: e.target.value.toLowerCase().trim() // Sanitize immediately
        }
      })}
    />
   {/* Password Field with Toggle */}
    <div className="relative">
      <Input 
        type={showPassword ? "text" : "password"} 
        placeholder="Password" 
        required={formData.create_account}
        className="pr-10" // Space for the icon
        onChange={e => setFormData({
          ...formData, 
          account: {
            ...formData.account, 
            password: e.target.value
          }
        })} 
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  </div>
)}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-border-strong">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-primary text-white">
              {loading ? 'Saving...' : isEdit ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}