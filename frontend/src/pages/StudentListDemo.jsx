import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DeleteConfirmCard } from '../components/ui/DeleteConfirmCard';
import { ImportMapperCard } from '../components/ui/ImportMapperCard';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

const defaultForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  gender: '',
  batch_id: '',
  admission_date: '',
  status: 'ACTIVE',
};

export function StudentListDemo() {
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState('single');
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [errors, setErrors] = useState({});

  const studentCrud = useCrud('students');
  const batchesCrud = useCrud('academics/batches');
  const levelCrud = useCrud('academics/levels');

  const studentsQuery = studentCrud.list({ page: 1, limit: 1000 });
  const batchesQuery = batchesCrud.list({ page: 1, limit: 1000 });
  const levelQuery = levelCrud.list({ page: 1, limit: 1000 });

  const createStudent = studentCrud.create();
  const updateStudent = studentCrud.update();
  const removeStudent = studentCrud.remove();

  const isMutating = createStudent.isPending || updateStudent.isPending;

  const [form, setForm] = useState({
    ...defaultForm,
    level_id: '',
    occupation_id: ''
  });

  const onChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    
    if (field === 'occupation_id') {
      setForm(prev => ({ ...prev, level_id: '' }));
    }
  };

  const resetForm = () => {
    setForm({
      ...defaultForm,
      level_id: '',
      occupation_id: ''
    });
    setEditingId(null);
    setErrors({});
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (isMutating) return;

    const payload = {
      ...form,
      batch_id: form.batch_id ? Number(form.batch_id) : null,
      level_id: form.level_id ? Number(form.level_id) : null,
      occupation_id: form.occupation_id ? Number(form.occupation_id) : null
    };

    if (editingId) {
      updateStudent.mutate({ id: editingId, payload, method: 'put' }, { onSuccess: resetForm });
    } else {
      createStudent.mutate(payload, { onSuccess: resetForm });
    }
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
      await removeStudent.mutateAsync(pendingDeleteId);
      setConfirmOpen(false);
      return;
    }

    if (deleteMode === 'bulk') {
      await Promise.allSettled(selectedIds.map((id) => removeStudent.mutateAsync(id)));
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
            checked={selectedIds.includes(row.original.student_pk)}
            onChange={(event) => toggleSelection(row.original.student_pk, event.target.checked)}
          />
        ),
      },
      { accessorKey: 'student_id', header: 'Student ID' },
      { accessorKey: 'full_name', header: 'Name' },
      { accessorKey: 'account_email', header: 'Email' },
      { accessorKey: 'batch.batch_code', header: 'Batch' },
      { accessorKey: 'status', header: 'Status' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(row.original.student_pk);
                setForm({
                  first_name: row.original.first_name || '',
                  middle_name: row.original.middle_name || '',
                  last_name: row.original.last_name || '',
                  email: row.original.email || '',
                  phone: row.original.phone || '',
                  gender: row.original.gender || '',
                  batch_id: row.original.batch_id || '',
                  level_id: row.original.level_id || '',
                  occupation_id: row.original.occupation_id || '',
                  admission_date: row.original.admission_date || '',
                  status: row.original.status || 'ACTIVE',
                });
              }}
            >
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => requestDeleteSingle(row.original.student_pk)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [selectedIds]
  );

  const importRows = async (rows, setProgress, context = {}) => {
    if (context.sourceFile) {
      const formData = new FormData();
      formData.append('file', context.sourceFile);
      formData.append('mapping', JSON.stringify(context.mapping || {}));

      setProgress(25);
      const response = await api.post('/students/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProgress(100);

      return { successes: Number(response.raw?.count || 0), errors: 0 };
    }

    const payload = rows.map((row) => ({
      ...row,
      batch_id: Number(row.batch_id),
      status: row.status || 'ACTIVE',
    }));

    setProgress(50);
    await api.post('/students/bulk', { rows: payload });
    setProgress(100);

    return { successes: payload.length, errors: 0 };
  };

  const uploadPhoto = async () => {
    if (!editingId || !photoFile) {
      return;
    }

    const formData = new FormData();
    formData.append('photo', photoFile);
    await api.post(`/students/${editingId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setPhotoFile(null);
    studentsQuery.refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Student Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-2 md:grid-cols-3" onSubmit={onSubmit}>
            <div className="flex flex-col gap-1">
              <Input value={form.first_name} onChange={(event) => onChange('first_name', event.target.value)} placeholder="First Name" required />
              {errors.first_name ? <p className="text-[11px] text-red-600">{errors.first_name}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <Input value={form.middle_name} onChange={(event) => onChange('middle_name', event.target.value)} placeholder="Middle Name" />
            </div>
            <div className="flex flex-col gap-1">
              <Input value={form.last_name} onChange={(event) => onChange('last_name', event.target.value)} placeholder="Last Name" required />
              {errors.last_name ? <p className="text-[11px] text-red-600">{errors.last_name}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <Input value={form.email} onChange={(event) => onChange('email', event.target.value)} placeholder="Email" />
            </div>
            <div className="flex flex-col gap-1">
              <Input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} placeholder="Phone" />
            </div>
            <div className="flex flex-col gap-1">
              <select
                value={form.gender}
                onChange={(event) => onChange('gender', event.target.value)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-brand-ink"
                required
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
              {errors.gender ? <p className="text-[11px] text-red-600">{errors.gender}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <select
                value={form.batch_id}
                onChange={(event) => onChange('batch_id', event.target.value)}
                className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
                required
              >
                <option value="">Select Batch</option>
                {(batchesQuery.data || []).map((batch) => (
                  <option key={batch.batch_id} value={batch.batch_id}>
                    {batch.batch_code}
                  </option>
                ))}
              </select>
              {errors.batch_id ? <p className="text-[11px] text-red-600">{errors.batch_id}</p> : null}
            </div>
            <div className="flex flex-col gap-1">
              <Input type="date" value={form.admission_date} onChange={(event) => onChange('admission_date', event.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Input value={form.status} onChange={(event) => onChange('status', event.target.value)} placeholder="Status" />
            </div>
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit" disabled={isMutating}>
                {editingId ? 'Update Student' : 'Create Student'}
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
        loading={removeStudent.isPending}
        title={deleteMode === 'bulk' ? 'Delete selected students?' : 'Delete student?'}
        description={
          deleteMode === 'bulk'
            ? `This will delete ${selectedIds.length} selected students.`
            : 'This student record will be deleted.'
        }
      />

      {importOpen ? (
        <ImportMapperCard
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title="Import Students from Excel/CSV"
          requiredFields={['first_name', 'last_name', 'batch_id', 'admission_date', 'status']}
          onImport={importRows}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Student List</span>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={selectedIds.length === 0 || removeStudent.isPending}
              onClick={requestDeleteBulk}
            >
              Delete Selected ({selectedIds.length})
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={studentsQuery.data}
            columns={columns}
            isLoading={studentsQuery.isLoading}
            isFetching={studentsQuery.isFetching}
            error={studentsQuery.error}
            emptyTitle="No students"
            emptyDescription="Register students manually or via import."
          />
        </CardContent>
      </Card>
    </div>
  );
}
