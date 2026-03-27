import { useMemo, useState } from 'react';
import { useCrud } from '../hooks/useCrud';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { Input } from '../components/ui/input';

export function SectorOccupationManager() {
  const [sectorName, setSectorName] = useState('');
  const [sectorCode, setSectorCode] = useState('');
  const sectorCrud = useCrud('academics/sectors');
  const occupationCrud = useCrud('academics/occupations');
  
  const sectorsQuery = sectorCrud.list();
  const occupationsQuery = occupationCrud.list();
  
  const createSector = sectorCrud.create();
  const deleteSector = sectorCrud.remove();

  const createOccupation = occupationCrud.create();
  const deleteOccupation = occupationCrud.remove();

  const sectorColumns = useMemo(
    () => [
      {
        accessorKey: 'sector_id',
        header: 'ID',
      },
      {
        accessorKey: 'sector_name',
        header: 'Sector Name',
      },
      {
        accessorKey: 'sector_code',
        header: 'Code',
        cell: ({ row }) => row.original.sector_code || 'N/A',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteSector.mutate(row.original.sector_id)}
            disabled={deleteSector.isPending}
          >
            Delete
          </Button>
        ),
      },
    ],
    [deleteSector]
  );

  const occupationColumns = useMemo(
    () => [
      { accessorKey: 'occupation_id', header: 'ID' },
      { accessorKey: 'occupation_name', header: 'Occupation' },
      { accessorKey: 'occupation_code', header: 'Code' },
      { 
        accessorKey: 'sector_id', 
        header: 'Sector',
        cell: ({ row }) => {
          const s = sectorsQuery.data?.find(sec => sec.sector_id === row.original.sector_id);
          return s ? s.sector_name : row.original.sector_id;
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteOccupation.mutate(row.original.occupation_id)}
            disabled={deleteOccupation.isPending}
          >
            Delete
          </Button>
        ),
      },
    ],
    [deleteOccupation, sectorsQuery.data]
  );

const onSubmitSector = (event) => {
    event.preventDefault();
    if (!sectorName.trim() || !sectorCode.trim()) {
      return;
    }

    createSector.mutate(
      {
        sector_name: sectorName.trim(),
        sector_code: sectorCode.trim().toUpperCase(),
      },
      {
        onSuccess: () => {
          setSectorName('');
          setSectorCode('');
        },
      }
    );
  };

  const [occForm, setOccForm] = useState({ name: '', code: '', sector_id: '' });
  const onSubmitOccupation = (event) => {
    event.preventDefault();
    if (!occForm.name || !occForm.code || !occForm.sector_id) return;

    createOccupation.mutate({
      occupation_name: occForm.name.trim(),
      occupation_code: occForm.code.trim().toUpperCase(),
      sector_id: Number(occForm.sector_id)
    }, {
      onSuccess: () => setOccForm({ name: '', code: '', sector_id: '' })
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Manage Sectors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmitSector}>
              <Input
                value={sectorCode}
                onChange={(event) => setSectorCode(event.target.value)}
                placeholder="Code (e.g., ICT)"
                className="max-w-[7rem]"
              />
              <Input
                value={sectorName}
                onChange={(event) => setSectorName(event.target.value)}
                placeholder="Sector Name"
              />
              <Button type="submit" disabled={createSector.isPending}>
                Add
              </Button>
            </form>
            
            <DataTable
              columns={sectorColumns}
              data={sectorsQuery.data}
              isLoading={sectorsQuery.isLoading}
              emptyTitle="No sectors"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manage Occupations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="grid grid-cols-1 sm:grid-cols-2 gap-2" onSubmit={onSubmitOccupation}>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={occForm.sector_id}
                onChange={(e) => setOccForm(prev => ({...prev, sector_id: e.target.value}))}
                required
              >
                <option value="">Select Sector</option>
                {sectorsQuery.data?.map(s => (
                  <option key={s.sector_id} value={s.sector_id}>{s.sector_name}</option>
                ))}
              </select>
              <Input
                value={occForm.code}
                onChange={(event) => setOccForm(prev => ({...prev, code: event.target.value}))}
                placeholder="Code (e.g., SWD)"
              />
              <Input
                value={occForm.name}
                onChange={(event) => setOccForm(prev => ({...prev, name: event.target.value}))}
                placeholder="Occupation Name"
                className="col-span-1 sm:col-span-2"
              />
              <Button type="submit" disabled={createOccupation.isPending} className="col-span-1 sm:col-span-2">
                Add Occupation
              </Button>
            </form>

            <DataTable
              columns={occupationColumns}
              data={occupationsQuery.data}
              isLoading={occupationsQuery.isLoading}
              emptyTitle="No occupations"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
