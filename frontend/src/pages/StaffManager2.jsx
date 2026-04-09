import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { DeleteConfirmCard } from '../components/ui/DeleteConfirmCard';
import { ImportMapperCard } from '../components/ui/ImportMapperCard';
import { Input } from '../components/ui/input';
import { useCrud } from '../hooks/useCrud';

const defaultForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  staff_type: 'ADMIN',
  employment_status: 'ACTIVE',
};

export function StaffManager2() {
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const staffCrud = useCrud('staff');
  const staffQuery = staffCrud.list({ page: 1, limit: 200 });
  const createStaff = staffCrud.create();
  const updateStaff = staffCrud.update();
  const removeStaff = staffCrud.remove();

  const onChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return;
    }

    if (editingId) {
      updateStaff.mutate(
        { id: editingId, payload: form, method: 'put' },
        {
          onSuccess: () => resetForm(),
        }
      );
      return;
    }

    createStaff.mutate(form, {
      onSuccess: () => resetForm(),
    });
  };

  const requestDeleteSingle = (id) => {
    setDeleteMode('single');
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const requestDeleteBulk = () => {
    setDeleteMode('bulk');
    setPendingDeleteId(null);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteMode === 'single' && pendingDeleteId) {
      await removeStaff.mutateAsync(pendingDeleteId);
      setConfirmOpen(false);
      return;
    }

    if (deleteMode === 'bulk') {
      await Promise.allSettled(selectedIds.map((id) => removeStaff.mutateAsync(id)));
      setSelectedIds([]);
      setConfirmOpen(false);
    }
  };

  const toggleSelection = (id, checked) => {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, id]));
      }
      return current.filter((value) => value !== id);
    });
  };

  const columns = useMemo(
    () => [
      {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.original.staff_id)}
            onChange={(event) => toggleSelection(row.original.staff_id, event.target.checked)}
          />
        ),
      },
      { accessorKey: 'staff_code', header: 'Staff Code' },
      { accessorKey: 'full_name', header: 'Name' },
      { accessorKey: 'staff_type', header: 'Staff Type' },
      { accessorKey: 'employment_status', header: 'Status' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(row.original.staff_id);
                setForm({
                  first_name: row.original.first_name || '',
                  middle_name: row.original.middle_name || '',
                  last_name: row.original.last_name || '',
                  email: row.original.email || '',
                  phone: row.original.phone || '',
                  gender: row.original.gender || '',
                  staff_type: row.original.staff_type || 'ADMIN',
                  employment_status: row.original.employment_status || 'ACTIVE',
                });
              }}
            >
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => requestDeleteSingle(row.original.staff_id)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [selectedIds]
  );

  const importRows = async (rows, setProgress) => {
    let successes = 0;
    let errors = 0;

    for (let index = 0; index < rows.length; index += 1) {
      try {
        await createStaff.mutateAsync({
          ...rows[index],
          staff_type: rows[index].staff_type || 'ADMIN',
          employment_status: rows[index].employment_status || 'ACTIVE',
        });
        successes += 1;
      } catch {
        errors += 1;
      }
      setProgress(Math.round(((index + 1) / rows.length) * 100));
    }

    return { successes, errors };
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Staff Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-3" onSubmit={onSubmit}>
            <Input value={form.first_name} onChange={(event) => onChange('first_name', event.target.value)} placeholder="First Name" required />
            <Input value={form.middle_name} onChange={(event) => onChange('middle_name', event.target.value)} placeholder="Middle Name" />
            <Input value={form.last_name} onChange={(event) => onChange('last_name', event.target.value)} placeholder="Last Name" required />
            <Input value={form.email} onChange={(event) => onChange('email', event.target.value)} placeholder="Email" />
            <Input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} placeholder="Phone" />
            <Input value={form.gender} onChange={(event) => onChange('gender', event.target.value)} placeholder="Gender" />
            <select
              value={form.staff_type}
              onChange={(event) => onChange('staff_type', event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="REGISTRAR">REGISTRAR</option>
              <option value="FINANCE">FINANCE</option>
              <option value="QA">QA</option>
            </select>
            <select
              value={form.employment_status}
              onChange={(event) => onChange('employment_status', event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON_LEAVE">ON_LEAVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit" disabled={createStaff.isPending || updateStaff.isPending}>
                {editingId ? 'Update Staff' : 'Create Staff'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel Edit
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setImportOpen((v) => !v)}>
                Import from Excel/CSV
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DeleteConfirmCard
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={removeStaff.isPending}
        title={deleteMode === 'bulk' ? 'Delete selected staff records?' : 'Delete staff record?'}
        description={
          deleteMode === 'bulk'
            ? `This will delete ${selectedIds.length} selected staff records.`
            : 'This staff record will be archived.'
        }
      />

      {importOpen ? (
        <ImportMapperCard
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title="Import Staff from Excel/CSV"
          requiredFields={['first_name', 'last_name', 'staff_type', 'employment_status']}
          onImport={importRows}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Staff List</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.length === 0 || removeStaff.isPending}
              onClick={requestDeleteBulk}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={staffQuery.data}
            isLoading={staffQuery.isLoading}
            isFetching={staffQuery.isFetching}
            error={staffQuery.error}
            emptyTitle="No staff"
            emptyDescription="Create staff manually or via import."
          />
        </CardContent>
      </Card>
    </div>
  );
}
