import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NestedTreeExplorer } from '../components/hierarchy/NestedTreeExplorer';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/skeleton';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

export function AcademicExplorer() {
  const [activeId, setActiveId] = useState(null);
  const [selectedSectorId, setSelectedSectorId] = useState(null);
  const [selectedOccupationId, setSelectedOccupationId] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);

  const sectorCrud = useCrud('academics/sectors');
  const occupationCrud = useCrud('academics/occupations');
  const levelCrud = useCrud('academics/levels');
  const batchCrud = useCrud('academics/batches');

  const sectorsQuery = sectorCrud.list();
  const occupationsQuery = occupationCrud.list(
    { page: 1, limit: 500, sector_id: selectedSectorId || undefined },
    { enabled: Boolean(selectedSectorId) }
  );
  const levelsQuery = levelCrud.list(
    { occupation_id: selectedOccupationId || undefined },
    { enabled: Boolean(selectedOccupationId) }
  );
  const batchesQuery = batchCrud.list(
    {
      page: 1,
      limit: 500,
      occupation_id: selectedOccupationId || undefined,
      level_id: selectedLevel?.level_id || undefined,
    },
    { enabled: Boolean(selectedOccupationId && selectedLevel?.level_id) }
  );

  const modulesQuery = useQuery({
    queryKey: ['academics', 'curriculum', selectedOccupationId, selectedLevel?.level_id],
    enabled: Boolean(selectedOccupationId && selectedLevel?.level_id),
    queryFn: async () => {
      const response = await api.get(
        `/academics/curriculum/${selectedOccupationId}/${selectedLevel.level_id}`
      );
      return response.payload || [];
    },
  });

  const isLoading =
    sectorsQuery.isLoading ||
    occupationsQuery.isLoading ||
    levelsQuery.isLoading ||
    batchesQuery.isLoading ||
    modulesQuery.isLoading;

  const error =
    sectorsQuery.error ||
    occupationsQuery.error ||
    levelsQuery.error ||
    batchesQuery.error ||
    modulesQuery.error;

  const nodes = useMemo(() => {
    const sectorNodes = (sectorsQuery.data || []).map((sector) => ({
      id: `sector-${sector.sector_id}`,
      label: `Sector: ${sector.sector_name}`,
      children:
        Number(selectedSectorId) === Number(sector.sector_id)
          ? (occupationsQuery.data || []).map((occupation) => ({
              id: `occupation-${occupation.occupation_id}`,
              label: `Occupation: ${occupation.occupation_name}`,
              children:
                Number(selectedOccupationId) === Number(occupation.occupation_id)
                  ? (levelsQuery.data || []).map((level) => ({
                      id: `level-${occupation.occupation_id}-${level.level_id}`,
                      label: `Level: ${level.level_name}`,
                      children:
                        selectedLevel && Number(selectedLevel.level_id) === Number(level.level_id)
                          ? [
                              ...(batchesQuery.data || []).map((batch) => ({
                                id: `batch-${batch.batch_id}`,
                                label: `Batch: ${batch.batch_code || batch.batch_id}`,
                                children: [],
                              })),
                              ...(modulesQuery.data || []).map((entry) => ({
                                id: `module-${entry.level_module_id}`,
                                label: `Module: ${entry.module?.m_code || entry.module?.unit_competency || entry.module_id}`,
                                children: [],
                              })),
                            ]
                          : [],
                    }))
                  : [],
            }))
          : [],
    }));

    return sectorNodes;
  }, [
    sectorsQuery.data,
    occupationsQuery.data,
    levelsQuery.data,
    batchesQuery.data,
    modulesQuery.data,
    selectedSectorId,
    selectedOccupationId,
    selectedLevel,
  ]);

  const onSelectNode = (node) => {
    setActiveId(node.id);

    if (node.id.startsWith('sector-')) {
      setSelectedSectorId(Number(node.id.replace('sector-', '')));
      setSelectedOccupationId(null);
      setSelectedLevel(null);
      return;
    }

    if (node.id.startsWith('occupation-')) {
      setSelectedOccupationId(Number(node.id.replace('occupation-', '')));
      setSelectedLevel(null);
      return;
    }

    if (node.id.startsWith('level-')) {
      const parts = node.id.replace('level-', '').split('-');
      const levelId = Number(parts[1]);
      const found = (levelsQuery.data || []).find((level) => Number(level.level_id) === levelId);
      setSelectedLevel(found || null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Explorer</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error.message || 'Failed to load explorer data.'}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-7 w-full" />
            <Skeleton className="h-7 w-11/12" />
            <Skeleton className="h-7 w-10/12" />
            <Skeleton className="h-7 w-9/12" />
          </div>
        ) : null}

        {!isLoading && !error && nodes.length === 0 ? (
          <EmptyState
            title="No academic hierarchy found"
            description="Create sectors, occupations, levels, and batches to populate the explorer."
          />
        ) : null}

        {!isLoading && !error && nodes.length > 0 ? (
          <NestedTreeExplorer nodes={nodes} activeId={activeId} onSelect={onSelectNode} />
        ) : null}
      </CardContent>
    </Card>
  );
}
