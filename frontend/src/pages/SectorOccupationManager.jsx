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
  const sectorsQuery = sectorCrud.list();
  const createSector = sectorCrud.create();
  const deleteSector = sectorCrud.remove();

  const columns = useMemo(
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

  const onSubmit = (event) => {
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sector and Occupation Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
            <Input
              value={sectorCode}
              onChange={(event) => setSectorCode(event.target.value)}
              placeholder="Code (e.g., ICT)"
              className="max-w-[10rem]"
            />
            <Input
              value={sectorName}
              onChange={(event) => setSectorName(event.target.value)}
              placeholder="New sector name"
              className="max-w-sm"
            />
            <Button type="submit" variant="default" disabled={createSector.isPending}>
              Create Sector
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sector Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sectorsQuery.data}
            isLoading={sectorsQuery.isLoading}
            isFetching={sectorsQuery.isFetching}
            error={sectorsQuery.error}
            emptyTitle="No sectors yet"
            emptyDescription="Create your first sector to start managing occupations."
          />
        </CardContent>
      </Card>
    </div>
  );
}
