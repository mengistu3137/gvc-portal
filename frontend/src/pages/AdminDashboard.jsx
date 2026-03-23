import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { DataTable } from '../components/ui/DataTable';
import { useCrud } from '../hooks/useCrud';

const quickLinks = [
  { label: 'User Management', description: 'Create, edit, assign roles', anchor: '#users' },
  { label: 'Access Control', description: 'View user roles and permissions', anchor: '#users' },
  { label: 'Audit & Activity', description: 'Check account statuses and login activity', anchor: '#users' },
];

const defaultUser = {
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  password: '',
  phone: '',
  gender: '',
  status: 'ACTIVE',
  role_codes: '',
};

const normalizeRoleCodes = (value) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export function AdminDashboard() {
  const [userSearch, setUserSearch] = useState('');
  const [form, setForm] = useState(defaultUser);
  const [editingId, setEditingId] = useState(null);

  const usersCrud = useCrud('auth', {
    listPath: () => '/auth',
    createPath: () => '/auth/create',
    updatePath: (id) => `/auth/${id}`,
    deletePath: (id) => `/auth/${id}`,
    mapCreatePayload: (payload) => ({
      ...payload,
      role_codes: normalizeRoleCodes(payload.role_codes),
    }),
    mapUpdatePayload: (payload) => {
      const next = { ...payload };
      if (!next.password) {
        delete next.password;
      }
      next.role_codes = normalizeRoleCodes(next.role_codes);
      return next;
    },
    mapList: (payload) => payload?.users || [],
  });

  const usersQuery = usersCrud.list({ page: 1, limit: 25, search: userSearch || undefined });
  const createUser = usersCrud.create();
  const updateUser = usersCrud.update();
  const deleteUser = usersCrud.remove();

  const rolesCrud = useCrud('auth/roles', {
    mapList: (payload) => payload?.rows || payload || [],
  });
  const rolesQuery = rolesCrud.list();

  const permissionsCrud = useCrud('auth/permissions', {
    mapList: (payload) => payload?.rows || payload || [],
  });
  const permissionsQuery = permissionsCrud.list();

  const onChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(defaultUser);
    setEditingId(null);
  };

  const submitUser = (event) => {
    event.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      return;
    }

    const payload = {
      ...form,
      role_codes: normalizeRoleCodes(form.role_codes),
    };

    if (editingId) {
      updateUser.mutate({ id: editingId, payload, method: 'put' }, { onSuccess: resetForm });
      return;
    }

    createUser.mutate(payload, { onSuccess: resetForm });
  };

  const userColumns = useMemo(
    () => [
      { accessorKey: 'user_id', header: 'ID' },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'full_name', header: 'Name' },
      { accessorKey: 'status', header: 'Status' },
      {
        id: 'roles',
        header: 'Roles',
        cell: ({ row }) =>
          (row.original.roles || [])
            .map((role) => role.role_code || role.role_name)
            .join(', ') || '—',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditingId(row.original.user_id);
                setForm({
                  first_name: row.original.first_name || '',
                  middle_name: row.original.middle_name || '',
                  last_name: row.original.last_name || '',
                  email: row.original.email || '',
                  phone: row.original.phone || '',
                  gender: row.original.gender || '',
                  status: row.original.status || 'ACTIVE',
                  role_codes: (row.original.roles || []).map((role) => role.role_code).join(', '),
                  password: '',
                });
              }}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => deleteUser.mutate(row.original.user_id)}
              disabled={deleteUser.isPending}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteUser]
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-5">
        {quickLinks.map((item) => (
          <a key={item.label} href={item.anchor} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="text-sm font-semibold">{item.label}</div>
            <div className="text-xs text-slate-600">{item.description}</div>
          </a>
        ))}
      </div>

      <Card id="users">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search users"
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              className="w-64"
            />
            <span className="text-xs text-slate-500">Search by email or name</span>
          </div>

          <form className="grid gap-2 md:grid-cols-3" onSubmit={submitUser}>
            <Input value={form.first_name} onChange={(event) => onChange('first_name', event.target.value)} placeholder="First name" required />
            <Input value={form.middle_name} onChange={(event) => onChange('middle_name', event.target.value)} placeholder="Middle name" />
            <Input value={form.last_name} onChange={(event) => onChange('last_name', event.target.value)} placeholder="Last name" required />
            <Input type="email" value={form.email} onChange={(event) => onChange('email', event.target.value)} placeholder="Email" required />
            <Input value={form.phone} onChange={(event) => onChange('phone', event.target.value)} placeholder="Phone" />
            <Input value={form.gender} onChange={(event) => onChange('gender', event.target.value)} placeholder="Gender" />
            <Input type="password" value={form.password} onChange={(event) => onChange('password', event.target.value)} placeholder={editingId ? 'New password (optional)' : 'Password'} />
            <select
              value={form.status}
              onChange={(event) => onChange('status', event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="LOCKED">LOCKED</option>
              <option value="DISABLED">DISABLED</option>
            </select>
            <Input
              value={form.role_codes}
              onChange={(event) => onChange('role_codes', event.target.value)}
              placeholder="Role codes (comma separated)"
              className="md:col-span-2"
            />
            <div className="md:col-span-3 flex gap-2">
              <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
                {editingId ? 'Update User' : 'Create User'}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel edit
                </Button>
              ) : null}
            </div>
          </form>

          <DataTable
            columns={userColumns}
            data={usersQuery.data}
            isLoading={usersQuery.isLoading}
            isFetching={usersQuery.isFetching}
            error={usersQuery.error}
            emptyTitle="No users"
            emptyDescription="Start by adding users."
          />
        </CardContent>
      </Card>

      <Card id="roles">
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DataTable
            columns={[
              { accessorKey: 'role_id', header: 'ID' },
              { accessorKey: 'role_code', header: 'Code' },
              { accessorKey: 'role_name', header: 'Name' },
              {
                id: 'perms',
                header: 'Permissions',
                cell: ({ row }) => (row.original.permissions || []).map((p) => p.permission_code).join(', ') || '—',
              },
            ]}
            data={rolesQuery.data}
            isLoading={rolesQuery.isLoading}
            isFetching={rolesQuery.isFetching}
            error={rolesQuery.error}
            emptyTitle="No roles"
            emptyDescription="Seed or create roles to manage access."
          />
        </CardContent>
      </Card>

      <Card id="permissions">
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { accessorKey: 'permission_id', header: 'ID' },
              { accessorKey: 'permission_code', header: 'Code' },
              { accessorKey: 'permission_name', header: 'Name' },
              { accessorKey: 'module_scope', header: 'Scope' },
            ]}
            data={permissionsQuery.data}
            isLoading={permissionsQuery.isLoading}
            isFetching={permissionsQuery.isFetching}
            error={permissionsQuery.error}
            emptyTitle="No permissions"
            emptyDescription="Define permissions to control capabilities."
          />
        </CardContent>
      </Card>
    </div>
  );
}
