import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { X, Eye, EyeOff } from 'lucide-react';

export function UniversalFormModal({ 
  open, 
  onClose, 
  onSubmit, 
  schema, 
  initialData = null, 
  title, 
  isLoading = false 
}) {
  const isEdit = !!initialData;
  const [formData, setFormData] = useState({});
  const [showPassword, setShowPassword] = useState({});

  // Helper: Get nested value using dot notation (e.g., 'account.email')
  const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  // Helper: Set nested value using dot notation
  const setNestedValue = (obj, path, value) => {
    if (!path) return obj;
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((acc, key) => {
      if (!acc[key]) acc[key] = {};
      return acc[key];
    }, obj);
    target[lastKey] = value;
    return { ...obj };
  };

  // Initialize form data when modal opens or schema/initialData changes
  useEffect(() => {
    if (open) {
      const defaultData = {};
      schema.forEach(field => {
        const value = getNestedValue(initialData, field.name);
        
        if (value !== undefined && value !== null) {
          defaultData[field.name] = value;
        } else if (field.type === 'select' && field.options?.length > 0) {
          defaultData[field.name] = field.options[0].value;
        } else if (field.type === 'checkbox-group' && field.options?.length > 0) {
          defaultData[field.name] = field.defaultValue || [];
        } else {
          defaultData[field.name] = field.defaultValue || '';
        }
      });
      setFormData(defaultData);
    }
  }, [open, initialData, schema]);

  const handleFieldChange = (name, value) => {
    setFormData(prev => setNestedValue({ ...prev }, name, value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  if (!open) return null;

  const renderField = (field) => {
    const value = getNestedValue(formData, field.name);
    const fieldId = field.name.replace(/\./g, '_');

    switch (field.type) {
      case 'select':
        return (
          <select
            id={fieldId}
            className="w-full h-10 px-3 rounded-md border border-border-strong text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            required={field.required}
            disabled={field.disabled}
          >
            <option value="">Select {field.label}</option>
            {field.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );

      case 'checkbox-group':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 border border-border-strong rounded-md bg-surface-muted/30">
            {field.options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-white rounded transition-colors">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                  checked={(value || []).includes(opt.value)}
                  onChange={(e) => {
                    const current = value || [];
                    const updated = e.target.checked
                      ? [...current, opt.value]
                      : current.filter(v => v !== opt.value);
                    handleFieldChange(field.name, updated);
                  }}
                />
                <span className="text-xs font-medium text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );

      case 'phone':
        return (
          <div className="relative flex items-center">
            <span className="absolute left-3 text-sm font-bold text-slate-400 border-r border-border-strong pr-2">
              {field.prefix || '+251'}
            </span>
            <Input
              id={fieldId}
              className="pl-16"
              value={value?.replace(field.prefix || '+251', '') || ''}
              onChange={(e) => handleFieldChange(field.name, `${field.prefix || '+251'}${e.target.value.replace(/\D/g, '')}`)}
              maxLength={field.maxLength || 9}
              required={field.required}
              placeholder={field.placeholder}
            />
          </div>
        );

      case 'password':
        return (
          <div className="relative">
            <Input
              id={fieldId}
              type={showPassword[field.name] ? "text" : "password"}
              placeholder={field.placeholder || (isEdit ? "Leave blank to keep current" : "Enter password")}
              required={field.required && !isEdit}
              className="pr-10"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
            >
              {showPassword[field.name] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        );

      case 'email':
        return (
          <Input
            id={fieldId}
            type="email"
            placeholder={field.placeholder || "email@example.com"}
            required={field.required}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.name, e.target.value.toLowerCase().trim())}
          />
        );

      case 'divider':
        return (
          <div className="col-span-1 md:col-span-2 pt-4 border-t border-border-strong mt-2">
            <h3 className="text-sm font-bold text-primary">{field.label}</h3>
          </div>
        );

      default: // text, number, etc.
        return (
          <Input
            id={fieldId}
            type={field.type || 'text'}
            placeholder={field.placeholder}
            required={field.required}
            value={value || ''}
            onChange={(e) => {
              let val = e.target.value;
              // Common Validation: Name Sanitization
              if (field.isName) val = val.replace(/[^a-zA-Z\s'-]/g, '');
              if (field.maxLength) val = val.slice(0, field.maxLength);
              handleFieldChange(field.name, val);
            }}
          />
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/40 backdrop-blur-sm p-4">
      <div className="bg-brand-surface w-full max-w-2xl rounded-xl shadow-panel max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border-strong flex justify-between items-center sticky top-0 bg-brand-surface z-10">
          <h2 className="text-xl font-bold text-primary">
            {isEdit ? `Update ${title}` : `New ${title}`}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500">
            <X />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.map((field) => (
              <div key={field.name} className={`space-y-1 ${field.fullWidth ? 'md:col-span-2' : ''}`}>
                {field.type !== 'divider' && (
                  <label htmlFor={field.name.replace(/\./g, '_')} className="text-xs font-bold first-letter:uppercase text-slate-500">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                {renderField(field)}
                {field.hint && <p className="text-xs text-slate-400">{field.hint}</p>}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border-strong">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-white">
              {isLoading ? 'Saving...' : isEdit ? 'Update' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}