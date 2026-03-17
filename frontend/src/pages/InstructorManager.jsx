import { useMemo, useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { DeleteConfirmCard } from '../components/ui/DeleteConfirmCard';
import { ImportMapperCard } from '../components/ui/ImportMapperCard';
import { Input } from '../components/ui/input';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  hire_date: '',
  occupation_id: '',
  qualification: '',
  employment_status: 'ACTIVE',
};

export function InstructorManager() {
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);

  const instructorCrud = useCrud('instructors');
  const occupationCrud = useCrud('academics/occupations');

  const instructorsQuery = instructorCrud.list({ page: 1, limit: 200 });
  const occupationsQuery = occupationCrud.list({ page: 1, limit: 500 });

  const createInstructor = instructorCrud.create();
  const updateInstructor = instructorCrud.update();
  const removeInstructor = instructorCrud.remove();

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

    const payload = {
      ...form,
      occupation_id: form.occupation_id ? Number(form.occupation_id) : null,
    };

    if (editingId) {
      updateInstructor.mutate(
        { id: editingId, payload, method: 'put' },
        {
          onSuccess: () => resetForm(),
        }
      );
      return;
    }

    createInstructor.mutate(payload, {
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
      await removeInstructor.mutateAsync(pendingDeleteId);
      setConfirmOpen(false);
      return;
    }

    if (deleteMode === 'bulk') {
      await Promise.allSettled(selectedIds.map((id) => removeInstructor.mutateAsync(id)));
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
            checked={selectedIds.includes(row.original.instructor_id)}
            onChange={(event) => toggleSelection(row.original.instructor_id, event.target.checked)}
          />
        ),
      },
      { accessorKey: 'staff_code', header: 'Staff Code' },
      { accessorKey: 'full_name', header: 'Name' },
      { accessorKey: 'qualification', header: 'Qualification' },
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
                setEditingId(row.original.instructor_id);
                setForm({
                  first_name: row.original.first_name || '',
                  middle_name: row.original.middle_name || '',
                  last_name: row.original.last_name || '',
                  email: row.original.email || '',
                  phone: row.original.phone || '',
                  gender: row.original.gender || '',
                  hire_date: row.original.hire_date || '',
                  occupation_id: row.original.occupation_id || '',
                  qualification: row.original.qualification || '',
                  employment_status: row.original.employment_status || 'ACTIVE',
                });
              }}
            >
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => requestDeleteSingle(row.original.instructor_id)}>
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
        await createInstructor.mutateAsync({
          ...rows[index],
          occupation_id: rows[index].occupation_id ? Number(rows[index].occupation_id) : null,
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

  const uploadPhoto = async () => {
    if (!editingId || !photoFile) {
      return;
    }

    const formData = new FormData();
    formData.append('photo', photoFile);
    await api.post(`/instructors/${editingId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPhotoFile(null);
    instructorsQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Instructor Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-3" onSubmit={onSubmit}>
            <Input value={form.first_name} onChange={(event) => onChange('first_name', event.target.value)} placeholder="First Name" required />
            <Input value={form.middle_name} onChange={(event) => onChange('middle_name', event.target.value)} placeholder="Middle Name" />
            <Input value={form.last_name} onChange={(event) => onChange('last_name', event.target.value)} placeholder="Last Name" required />
            <Input value={form.email} onChange={(event) => onChange('email', event.target.value)} placeholder="Email" />
            <Input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} placeholder="Phone" />
            <Input value={form.gender} onChange={(event) => onChange('gender', event.target.value)} placeholder="Gender" />
            <Input type="date" value={form.hire_date} onChange={(event) => onChange('hire_date', event.target.value)} />
            <Input value={form.qualification} onChange={(event) => onChange('qualification', event.target.value)} placeholder="Qualification" />
            <select
              value={form.occupation_id}
              onChange={(event) => onChange('occupation_id', event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="">Select Occupation</option>
              {(occupationsQuery.data || []).map((occupation) => (
                <option key={occupation.occupation_id} value={occupation.occupation_id}>
                  {occupation.occupation_name}
                </option>
              ))}
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
              <Button type="submit" disabled={createInstructor.isPending || updateInstructor.isPending}>
                {editingId ? 'Update Instructor' : 'Create Instructor'}
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

            {editingId ? (
              <div className="md:col-span-3 flex flex-wrap items-center gap-2 rounded-md border border-slate-200 p-3">
                <Input type="file" accept="image/*" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} />
                <Button type="button" variant="outline" onClick={uploadPhoto} disabled={!photoFile}>
                  Upload Profile Photo
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <DeleteConfirmCard
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={removeInstructor.isPending}
        title={deleteMode === 'bulk' ? 'Delete selected instructors?' : 'Delete instructor?'}
        description={
          deleteMode === 'bulk'
            ? `This will delete ${selectedIds.length} selected instructors.`
            : 'This instructor record will be archived.'
        }
      />

      {importOpen ? (
        <ImportMapperCard
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title="Import Instructors from Excel/CSV"
          requiredFields={['first_name', 'last_name', 'occupation_id', 'qualification', 'hire_date']}
          onImport={importRows}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Instructor List</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.length === 0 || removeInstructor.isPending}
              onClick={requestDeleteBulk}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={instructorsQuery.data}
            isLoading={instructorsQuery.isLoading}
            isFetching={instructorsQuery.isFetching}
            error={instructorsQuery.error}
            emptyTitle="No instructors"
            emptyDescription="Create instructors manually or via import."
          />
        </CardContent>
      </Card>
    </div>
  );
}
