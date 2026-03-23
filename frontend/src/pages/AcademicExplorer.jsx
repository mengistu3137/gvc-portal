import { useMemo, useState } from 'react';
import { HierarchicalHeader } from '../components/hierarchy/HierarchicalHeader';
import { NestedTreeExplorer } from '../components/hierarchy/NestedTreeExplorer';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ImportMapperCard } from '../components/ui/ImportMapperCard';
import { Input } from '../components/ui/input';
import { Skeleton } from '../components/ui/skeleton';
import { useCrud } from '../hooks/useCrud';
import { api } from '../lib/api';

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value) {
  return String(value ?? '').trim();
}

function toTrackType(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized === 'EXTENSION' ? 'EXTENSION' : 'REGULAR';
}

export function AcademicExplorer() {
  const [activeId, setActiveId] = useState(null);
  const [selectedSectorId, setSelectedSectorId] = useState(null);
  const [selectedOccupationId, setSelectedOccupationId] = useState(null);
  const [selectedLevelId, setSelectedLevelId] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const [importType, setImportType] = useState('sector');
  const [showImporter, setShowImporter] = useState(false);

  const [newSector, setNewSector] = useState({ sector_code: '', sector_name: '' });
  const [newOccupation, setNewOccupation] = useState({ occupation_code: '', occupation_name: '' });
  const [newLevel, setNewLevel] = useState({ level_id: '', level_name: 'I' });
  const [newAcademicYear, setNewAcademicYear] = useState({
    academic_year_label: '',
    start_date: '',
    end_date: '',
  });
  const [newBatch, setNewBatch] = useState({ academic_year_id: '', level_id: '', track_type: 'REGULAR', capacity: '' });
  const [newModule, setNewModule] = useState({
    m_code: '',
    unit_competency: '',
    credit_units: '',
    theory_hours: '',
    practical_hours: '',
    cooperative_hours: '',
    learning_hours: '',
  });
  const [newCurriculum, setNewCurriculum] = useState({ m_code: '', semester: '1' });

  const [editingSectorId, setEditingSectorId] = useState(null);
  const [editingSectorDraft, setEditingSectorDraft] = useState({});
  const [editingOccupationId, setEditingOccupationId] = useState(null);
  const [editingOccupationDraft, setEditingOccupationDraft] = useState({});
  const [editingLevelKey, setEditingLevelKey] = useState(null);
  const [editingLevelDraft, setEditingLevelDraft] = useState({});
  const [editingBatchId, setEditingBatchId] = useState(null);
  const [editingBatchDraft, setEditingBatchDraft] = useState({});
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingModuleDraft, setEditingModuleDraft] = useState({});

  const sectorCrud = useCrud('academics/sectors');
  const occupationCrud = useCrud('academics/occupations');
  const levelCrud = useCrud('academics/levels', {
    getOnePath: (id) => `/academics/levels/${id}`,
    updatePath: (id) => `/academics/levels/${id}`,
    deletePath: (id) => `/academics/levels/${id}`,
  });
  const batchCrud = useCrud('academics/batches');
  const moduleCrud = useCrud('academics/modules');
  const academicYearCrud = useCrud('academics/academic-years');
  const curriculumCrud = useCrud('academics/curriculum', {
    listPath: (params) => `/academics/curriculum/${params.occupation_id}/${params.level_id}`,
    createPath: () => '/academics/curriculum',
    deletePath: (id) => `/academics/curriculum/${id}`,
  });

  const createSector = sectorCrud.create();
  const updateSector = sectorCrud.update();
  const deleteSector = sectorCrud.remove();

  const createOccupation = occupationCrud.create();
  const updateOccupation = occupationCrud.update();
  const deleteOccupation = occupationCrud.remove();

  const createLevel = levelCrud.create();
  const updateLevel = levelCrud.update();
  const deleteLevel = levelCrud.remove();

  const createBatch = batchCrud.create();
  const updateBatch = batchCrud.update();
  const deleteBatch = batchCrud.remove();

  const createModule = moduleCrud.create();
  const updateModule = moduleCrud.update();
  const deleteModule = moduleCrud.remove();

  const createAcademicYear = academicYearCrud.create();

  const addCurriculumEntry = curriculumCrud.create();
  const removeCurriculumEntry = curriculumCrud.remove();

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
      level_id: selectedLevelId || undefined,
    },
    { enabled: Boolean(selectedOccupationId && selectedLevelId) }
  );
  const modulesQuery = moduleCrud.list(
    { page: 1, limit: 500, occupation_id: selectedOccupationId || undefined },
    { enabled: Boolean(selectedOccupationId) }
  );
  const academicYearsQuery = academicYearCrud.list();

  const selectedBatch = useMemo(
    () => (batchesQuery.data || []).find((batch) => Number(batch.batch_id) === Number(selectedBatchId)) || null,
    [batchesQuery.data, selectedBatchId]
  );

  const curriculumScope = selectedBatch
    ? {
        occupation_id: selectedBatch.occupation_id,
        level_id: selectedBatch.level_id,
      }
    : null;

  const curriculumQuery = curriculumCrud.list(curriculumScope || { occupation_id: null, level_id: null }, {
    enabled: Boolean(curriculumScope),
  });

  const isLoading =
    sectorsQuery.isLoading ||
    occupationsQuery.isLoading ||
    levelsQuery.isLoading ||
    batchesQuery.isLoading;

  const error =
    sectorsQuery.error ||
    occupationsQuery.error ||
    levelsQuery.error ||
    batchesQuery.error;

  const selectedSector = useMemo(
    () => (sectorsQuery.data || []).find((sector) => Number(sector.sector_id) === Number(selectedSectorId)) || null,
    [sectorsQuery.data, selectedSectorId]
  );

  const selectedOccupation = useMemo(
    () =>
      (occupationsQuery.data || []).find(
        (occupation) => Number(occupation.occupation_id) === Number(selectedOccupationId)
      ) || null,
    [occupationsQuery.data, selectedOccupationId]
  );

  const selectedLevel = useMemo(
    () => (levelsQuery.data || []).find((level) => Number(level.level_id) === Number(selectedLevelId)) || null,
    [levelsQuery.data, selectedLevelId]
  );

  const importConfigs = {
    sector: {
      title: 'Import sectors',
      endpoint: '/academics/sectors',
      requiredFields: ['sector_code', 'sector_name'],
      map: (row) => ({
        sector_code: asText(row.sector_code).toUpperCase(),
        sector_name: asText(row.sector_name),
      }),
    },
    occupation: {
      title: 'Import occupations',
      endpoint: '/academics/occupations',
      requiredFields: ['sector_id', 'occupation_code', 'occupation_name'],
      map: (row) => ({
        sector_id: asNumber(row.sector_id),
        occupation_code: asText(row.occupation_code).toUpperCase(),
        occupation_name: asText(row.occupation_name),
      }),
    },
    level: {
      title: 'Import levels',
      endpoint: '/academics/levels',
      requiredFields: ['occupation_id', 'level_id', 'level_name'],
      map: (row) => ({
        occupation_id: asNumber(row.occupation_id),
        level_id: asNumber(row.level_id),
        level_name: asText(row.level_name).toUpperCase(),
      }),
    },
    academicYear: {
      title: 'Import academic years',
      endpoint: '/academics/academic-years',
      requiredFields: ['academic_year_label', 'start_date', 'end_date'],
      map: (row) => ({
        academic_year_label: asText(row.academic_year_label),
        start_date: asText(row.start_date),
        end_date: asText(row.end_date),
      }),
    },
    batch: {
      title: 'Import batches',
      endpoint: '/academics/batches',
      requiredFields: ['occupation_id', 'academic_year_id', 'level_id', 'track_type', 'capacity'],
      map: (row) => ({
        occupation_id: asNumber(row.occupation_id),
        academic_year_id: asNumber(row.academic_year_id),
        level_id: asNumber(row.level_id),
        track_type: toTrackType(row.track_type),
        capacity: asNumber(row.capacity),
      }),
    },
    module: {
      title: 'Import modules',
      endpoint: '/academics/modules',
      requiredFields: [
        'occupation_id',
        'm_code',
        'unit_competency',
        'credit_units',
        'theory_hours',
        'practical_hours',
        'cooperative_hours',
        'learning_hours',
      ],
      map: (row) => ({
        occupation_id: asNumber(row.occupation_id),
        m_code: asText(row.m_code).toUpperCase(),
        unit_competency: asText(row.unit_competency),
        credit_units: asNumber(row.credit_units),
        theory_hours: asNumber(row.theory_hours),
        practical_hours: asNumber(row.practical_hours),
        cooperative_hours: asNumber(row.cooperative_hours),
        learning_hours: asNumber(row.learning_hours),
      }),
    },
  };

  const currentImport = importConfigs[importType];

  const runImport = async (rows, setProgress) => {
    const config = importConfigs[importType];
    let successes = 0;
    let errors = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      try {
        await api.post(config.endpoint, config.map(row));
        successes += 1;
      } catch {
        errors += 1;
      }

      const completion = Math.round(((index + 1) / rows.length) * 100);
      setProgress(completion);
    }

    sectorsQuery.refetch();
    occupationsQuery.refetch();
    levelsQuery.refetch();
    batchesQuery.refetch();
    modulesQuery.refetch();
    academicYearsQuery.refetch();
    curriculumQuery.refetch();

    return { successes, errors };
  };

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
                        selectedLevelId && Number(selectedLevelId) === Number(level.level_id)
                          ? (batchesQuery.data || []).map((batch) => ({
                              id: `batch-${batch.batch_id}`,
                              label: `Batch: ${batch.batch_code || batch.batch_id}`,
                              children:
                                Number(selectedBatchId) === Number(batch.batch_id)
                                  ? (curriculumQuery.data || []).map((entry) => ({
                                      id: `module-${entry.level_module_id}`,
                                      label: `Module: ${entry.module?.m_code || entry.m_code}`,
                                      children: [],
                                    }))
                                  : [],
                            }))
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
    curriculumQuery.data,
    selectedSectorId,
    selectedOccupationId,
    selectedLevelId,
    selectedBatchId,
  ]);

  const onSelectNode = (node) => {
    setActiveId(node.id);

    if (node.id.startsWith('sector-')) {
      setSelectedSectorId(Number(node.id.replace('sector-', '')));
      setSelectedOccupationId(null);
      setSelectedLevelId(null);
      setSelectedBatchId(null);
      return;
    }

    if (node.id.startsWith('occupation-')) {
      setSelectedOccupationId(Number(node.id.replace('occupation-', '')));
      setSelectedLevelId(null);
      setSelectedBatchId(null);
      return;
    }

    if (node.id.startsWith('level-')) {
      const parts = node.id.replace('level-', '').split('-');
      setSelectedLevelId(Number(parts[1]));
      setSelectedBatchId(null);
      return;
    }

    if (node.id.startsWith('batch-')) {
      setSelectedBatchId(Number(node.id.replace('batch-', '')));
    }
  };

  const headerItems = [
    {
      label: selectedSector ? selectedSector.sector_name : 'Sectors',
      onClick: () => {
        setSelectedSectorId(null);
        setSelectedOccupationId(null);
        setSelectedLevelId(null);
        setSelectedBatchId(null);
      },
    },
  ];

  if (selectedSector) {
    headerItems.push({
      label: selectedOccupation ? selectedOccupation.occupation_name : 'Occupations',
      onClick: () => {
        setSelectedOccupationId(null);
        setSelectedLevelId(null);
        setSelectedBatchId(null);
      },
    });
  }

  if (selectedOccupation) {
    headerItems.push({
      label: selectedLevel ? `Level ${selectedLevel.level_name}` : 'Levels',
      onClick: () => {
        setSelectedLevelId(null);
        setSelectedBatchId(null);
      },
    });
  }

  if (selectedLevel) {
    headerItems.push({
      label: selectedBatch ? selectedBatch.batch_code : 'Batches',
      onClick: () => setSelectedBatchId(null),
    });
  }

  const sectorColumns = useMemo(
    () => [
      { accessorKey: 'sector_id', header: 'Id' },
      {
        accessorKey: 'sector_code',
        header: 'Code',
        cell: ({ row }) =>
          Number(editingSectorId) === Number(row.original.sector_id) ? (
            <Input
              value={editingSectorDraft.sector_code || ''}
              onChange={(event) =>
                setEditingSectorDraft((prev) => ({ ...prev, sector_code: event.target.value }))
              }
            />
          ) : (
            row.original.sector_code
          ),
      },
      {
        accessorKey: 'sector_name',
        header: 'Sector name',
        cell: ({ row }) =>
          Number(editingSectorId) === Number(row.original.sector_id) ? (
            <Input
              value={editingSectorDraft.sector_name || ''}
              onChange={(event) =>
                setEditingSectorDraft((prev) => ({ ...prev, sector_name: event.target.value }))
              }
            />
          ) : (
            row.original.sector_name
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const isEditing = Number(editingSectorId) === Number(row.original.sector_id);

          if (isEditing) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() =>
                    updateSector.mutate({
                      id: row.original.sector_id,
                      payload: {
                        sector_code: asText(editingSectorDraft.sector_code).toUpperCase(),
                        sector_name: asText(editingSectorDraft.sector_name),
                      },
                      method: 'put',
                    })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingSectorId(null)}>
                  Cancel
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingSectorId(row.original.sector_id);
                  setEditingSectorDraft({
                    sector_code: row.original.sector_code || '',
                    sector_name: row.original.sector_name || '',
                  });
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteSector.mutate(row.original.sector_id)}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteSector, editingSectorDraft, editingSectorId, updateSector]
  );

  const occupationColumns = useMemo(
    () => [
      { accessorKey: 'occupation_id', header: 'Id' },
      {
        accessorKey: 'occupation_code',
        header: 'Code',
        cell: ({ row }) =>
          Number(editingOccupationId) === Number(row.original.occupation_id) ? (
            <Input
              value={editingOccupationDraft.occupation_code || ''}
              onChange={(event) =>
                setEditingOccupationDraft((prev) => ({
                  ...prev,
                  occupation_code: event.target.value,
                }))
              }
            />
          ) : (
            row.original.occupation_code
          ),
      },
      {
        accessorKey: 'occupation_name',
        header: 'Occupation name',
        cell: ({ row }) =>
          Number(editingOccupationId) === Number(row.original.occupation_id) ? (
            <Input
              value={editingOccupationDraft.occupation_name || ''}
              onChange={(event) =>
                setEditingOccupationDraft((prev) => ({
                  ...prev,
                  occupation_name: event.target.value,
                }))
              }
            />
          ) : (
            row.original.occupation_name
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const isEditing = Number(editingOccupationId) === Number(row.original.occupation_id);

          if (isEditing) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() =>
                    updateOccupation.mutate({
                      id: row.original.occupation_id,
                      payload: {
                        occupation_code: asText(editingOccupationDraft.occupation_code).toUpperCase(),
                        occupation_name: asText(editingOccupationDraft.occupation_name),
                        sector_id: selectedSectorId,
                      },
                      method: 'put',
                    })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingOccupationId(null)}>
                  Cancel
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingOccupationId(row.original.occupation_id);
                  setEditingOccupationDraft({
                    occupation_code: row.original.occupation_code || '',
                    occupation_name: row.original.occupation_name || '',
                  });
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteOccupation.mutate(row.original.occupation_id)}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteOccupation, editingOccupationDraft, editingOccupationId, selectedSectorId, updateOccupation]
  );

  const levelColumns = useMemo(
    () => [
      { accessorKey: 'level_id', header: 'Id' },
      {
        accessorKey: 'level_name',
        header: 'Level name',
        cell: ({ row }) => {
          const key = `${row.original.level_id}/${row.original.occupation_id}`;
          return editingLevelKey === key ? (
            <select
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              value={editingLevelDraft.level_name || 'I'}
              onChange={(event) =>
                setEditingLevelDraft((prev) => ({ ...prev, level_name: event.target.value }))
              }
            >
              <option value="I">I</option>
              <option value="II">II</option>
              <option value="III">III</option>
              <option value="IV">IV</option>
              <option value="V">V</option>
            </select>
          ) : (
            row.original.level_name
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const key = `${row.original.level_id}/${row.original.occupation_id}`;
          const isEditing = editingLevelKey === key;

          if (isEditing) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() =>
                    updateLevel.mutate({
                      id: key,
                      payload: { level_name: editingLevelDraft.level_name },
                      method: 'put',
                    })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingLevelKey(null)}>
                  Cancel
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingLevelKey(key);
                  setEditingLevelDraft({ level_name: row.original.level_name || 'I' });
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteLevel.mutate(key)}>
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteLevel, editingLevelDraft.level_name, editingLevelKey, updateLevel]
  );

  const batchColumns = useMemo(
    () => [
      { accessorKey: 'batch_id', header: 'Id' },
      { accessorKey: 'batch_code', header: 'Batch code' },
      {
        accessorKey: 'track_type',
        header: 'Track type',
        cell: ({ row }) =>
          Number(editingBatchId) === Number(row.original.batch_id) ? (
            <select
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              value={editingBatchDraft.track_type || 'REGULAR'}
              onChange={(event) =>
                setEditingBatchDraft((prev) => ({ ...prev, track_type: event.target.value }))
              }
            >
              <option value="REGULAR">Regular</option>
              <option value="EXTENSION">Extension</option>
            </select>
          ) : (
            row.original.track_type
          ),
      },
      {
        accessorKey: 'capacity',
        header: 'Capacity',
        cell: ({ row }) =>
          Number(editingBatchId) === Number(row.original.batch_id) ? (
            <Input
              value={editingBatchDraft.capacity || ''}
              onChange={(event) =>
                setEditingBatchDraft((prev) => ({ ...prev, capacity: event.target.value }))
              }
            />
          ) : (
            row.original.capacity
          ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const isEditing = Number(editingBatchId) === Number(row.original.batch_id);

          if (isEditing) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() =>
                    updateBatch.mutate({
                      id: row.original.batch_id,
                      payload: {
                        occupation_id: row.original.occupation_id,
                        academic_year_id: row.original.academic_year_id,
                        level_id: row.original.level_id,
                        track_type: toTrackType(editingBatchDraft.track_type),
                        capacity: asNumber(editingBatchDraft.capacity),
                      },
                      method: 'put',
                    })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBatchId(null)}>
                  Cancel
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingBatchId(row.original.batch_id);
                  setEditingBatchDraft({
                    track_type: row.original.track_type || 'REGULAR',
                    capacity: row.original.capacity ?? 0,
                  });
                }}
              >
                Edit
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deleteBatch.mutate(row.original.batch_id)}>
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteBatch, editingBatchDraft, editingBatchId, updateBatch]
  );

  const moduleColumns = useMemo(
    () => [
      { accessorKey: 'module_id', header: 'Id' },
      {
        accessorKey: 'm_code',
        header: 'Code',
        cell: ({ row }) =>
          Number(editingModuleId) === Number(row.original.module_id) ? (
            <Input
              value={editingModuleDraft.m_code || ''}
              onChange={(event) =>
                setEditingModuleDraft((prev) => ({ ...prev, m_code: event.target.value }))
              }
            />
          ) : (
            row.original.m_code
          ),
      },
      {
        accessorKey: 'unit_competency',
        header: 'Unit competency',
        cell: ({ row }) =>
          Number(editingModuleId) === Number(row.original.module_id) ? (
            <Input
              value={editingModuleDraft.unit_competency || ''}
              onChange={(event) =>
                setEditingModuleDraft((prev) => ({
                  ...prev,
                  unit_competency: event.target.value,
                }))
              }
            />
          ) : (
            row.original.unit_competency
          ),
      },
      { accessorKey: 'credit_units', header: 'Credits' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const isEditing = Number(editingModuleId) === Number(row.original.module_id);

          if (isEditing) {
            return (
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={() =>
                    updateModule.mutate({
                      id: row.original.module_id,
                      payload: {
                        occupation_id: row.original.occupation_id,
                        m_code: asText(editingModuleDraft.m_code).toUpperCase(),
                        unit_competency: asText(editingModuleDraft.unit_competency),
                        credit_units: row.original.credit_units,
                        theory_hours: row.original.theory_hours,
                        practical_hours: row.original.practical_hours,
                        cooperative_hours: row.original.cooperative_hours,
                        learning_hours: row.original.learning_hours,
                      },
                      method: 'put',
                    })
                  }
                >
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingModuleId(null)}>
                  Cancel
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingModuleId(row.original.module_id);
                  setEditingModuleDraft({
                    m_code: row.original.m_code || '',
                    unit_competency: row.original.unit_competency || '',
                  });
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteModule.mutate(row.original.module_id)}
              >
                Delete
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteModule, editingModuleDraft, editingModuleId, updateModule]
  );

  const curriculumColumns = useMemo(
    () => [
      { accessorKey: 'level_module_id', header: 'Id' },
      { accessorKey: 'm_code', header: 'Module code' },
      {
        accessorKey: 'module.unit_competency',
        header: 'Unit competency',
        cell: ({ row }) => row.original.module?.unit_competency || 'Not available',
      },
      { accessorKey: 'semester', header: 'Semester' },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => removeCurriculumEntry.mutate(row.original.level_module_id)}
          >
            Delete
          </Button>
        ),
      },
    ],
    [removeCurriculumEntry]
  );

  return (
    <div className="space-y-4">
      <HierarchicalHeader items={headerItems} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Hierarchy explorer</CardTitle>
          </CardHeader>
          <CardContent>
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
                title="No hierarchy records"
                description="Create sectors, occupations, levels, and batches to populate the explorer."
              />
            ) : null}

            {!isLoading && !error && nodes.length > 0 ? (
              <NestedTreeExplorer nodes={nodes} activeId={activeId} onSelect={onSelectNode} />
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-[#f9fafb]">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Academic master data</CardTitle>
              <div className="flex items-center gap-2">
                <select
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                  value={importType}
                  onChange={(event) => setImportType(event.target.value)}
                >
                  <option value="sector">Sectors</option>
                  <option value="occupation">Occupations</option>
                  <option value="level">Levels</option>
                  <option value="academicYear">Academic years</option>
                  <option value="batch">Batches</option>
                  <option value="module">Modules</option>
                </select>
                <Button size="sm" variant="outline" onClick={() => setShowImporter((prev) => !prev)}>
                  {showImporter ? 'Hide import' : 'Import Excel or CSV'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showImporter ? (
                <ImportMapperCard
                  open={showImporter}
                  title={currentImport.title}
                  requiredFields={currentImport.requiredFields}
                  onClose={() => setShowImporter(false)}
                  onImport={runImport}
                />
              ) : (
                <p className="text-xs text-slate-500">
                  Import supports Excel and CSV for all academic master data entities.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sectors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                className="grid gap-2 md:grid-cols-[140px_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  createSector.mutate(
                    {
                      sector_code: asText(newSector.sector_code).toUpperCase(),
                      sector_name: asText(newSector.sector_name),
                    },
                    {
                      onSuccess: () => setNewSector({ sector_code: '', sector_name: '' }),
                    }
                  );
                }}
              >
                <Input
                  placeholder="Code"
                  value={newSector.sector_code}
                  onChange={(event) =>
                    setNewSector((prev) => ({ ...prev, sector_code: event.target.value }))
                  }
                />
                <Input
                  placeholder="Sector name"
                  value={newSector.sector_name}
                  onChange={(event) =>
                    setNewSector((prev) => ({ ...prev, sector_name: event.target.value }))
                  }
                />
                <Button type="submit" size="sm">
                  Add sector
                </Button>
              </form>

              <DataTable
                columns={sectorColumns}
                data={sectorsQuery.data}
                isLoading={sectorsQuery.isLoading}
                isFetching={sectorsQuery.isFetching}
                error={sectorsQuery.error}
                emptyTitle="No sectors"
                emptyDescription="Create a sector to start building the hierarchy."
              />
            </CardContent>
          </Card>

          {selectedSector ? (
            <Card>
              <CardHeader>
                <CardTitle>Occupations in {selectedSector.sector_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="grid gap-2 md:grid-cols-[160px_1fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createOccupation.mutate(
                      {
                        sector_id: selectedSectorId,
                        occupation_code: asText(newOccupation.occupation_code).toUpperCase(),
                        occupation_name: asText(newOccupation.occupation_name),
                      },
                      {
                        onSuccess: () =>
                          setNewOccupation({ occupation_code: '', occupation_name: '' }),
                      }
                    );
                  }}
                >
                  <Input
                    placeholder="Code"
                    value={newOccupation.occupation_code}
                    onChange={(event) =>
                      setNewOccupation((prev) => ({ ...prev, occupation_code: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Occupation name"
                    value={newOccupation.occupation_name}
                    onChange={(event) =>
                      setNewOccupation((prev) => ({ ...prev, occupation_name: event.target.value }))
                    }
                  />
                  <Button type="submit" size="sm">
                    Add occupation
                  </Button>
                </form>

                <DataTable
                  columns={occupationColumns}
                  data={occupationsQuery.data}
                  isLoading={occupationsQuery.isLoading}
                  isFetching={occupationsQuery.isFetching}
                  error={occupationsQuery.error}
                  emptyTitle="No occupations"
                  emptyDescription="Add an occupation to continue hierarchy setup."
                />
              </CardContent>
            </Card>
          ) : null}

          {selectedOccupation ? (
            <Card>
              <CardHeader>
                <CardTitle>Levels for {selectedOccupation.occupation_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="grid gap-2 md:grid-cols-[100px_140px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createLevel.mutate(
                      {
                        occupation_id: selectedOccupationId,
                        level_id: asNumber(newLevel.level_id),
                        level_name: newLevel.level_name,
                      },
                      {
                        onSuccess: () => setNewLevel({ level_id: '', level_name: 'I' }),
                      }
                    );
                  }}
                >
                  <Input
                    placeholder="Level id"
                    value={newLevel.level_id}
                    onChange={(event) => setNewLevel((prev) => ({ ...prev, level_id: event.target.value }))}
                  />
                  <select
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={newLevel.level_name}
                    onChange={(event) =>
                      setNewLevel((prev) => ({ ...prev, level_name: event.target.value }))
                    }
                  >
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                    <option value="V">V</option>
                  </select>
                  <Button type="submit" size="sm">
                    Add level
                  </Button>
                </form>

                <DataTable
                  columns={levelColumns}
                  data={levelsQuery.data}
                  isLoading={levelsQuery.isLoading}
                  isFetching={levelsQuery.isFetching}
                  error={levelsQuery.error}
                  emptyTitle="No levels"
                  emptyDescription="Add a level to activate batch planning."
                />
              </CardContent>
            </Card>
          ) : null}

          {selectedOccupation ? (
            <Card>
              <CardHeader>
                <CardTitle>Modules for {selectedOccupation.occupation_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="grid gap-2 md:grid-cols-[140px_1fr_120px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createModule.mutate(
                      {
                        occupation_id: selectedOccupationId,
                        m_code: asText(newModule.m_code).toUpperCase(),
                        unit_competency: asText(newModule.unit_competency),
                        credit_units: asNumber(newModule.credit_units),
                        theory_hours: asNumber(newModule.theory_hours),
                        practical_hours: asNumber(newModule.practical_hours),
                        cooperative_hours: asNumber(newModule.cooperative_hours),
                        learning_hours: asNumber(newModule.learning_hours),
                      },
                      {
                        onSuccess: () =>
                          setNewModule({
                            m_code: '',
                            unit_competency: '',
                            credit_units: '',
                            theory_hours: '',
                            practical_hours: '',
                            cooperative_hours: '',
                            learning_hours: '',
                          }),
                      }
                    );
                  }}
                >
                  <Input
                    placeholder="Module code"
                    value={newModule.m_code}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, m_code: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Unit competency"
                    value={newModule.unit_competency}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, unit_competency: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Credits"
                    value={newModule.credit_units}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, credit_units: event.target.value }))
                    }
                  />
                  <Button type="submit" size="sm">
                    Add module
                  </Button>
                  <Input
                    placeholder="Theory hours"
                    value={newModule.theory_hours}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, theory_hours: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Practical hours"
                    value={newModule.practical_hours}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, practical_hours: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Cooperative hours"
                    value={newModule.cooperative_hours}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, cooperative_hours: event.target.value }))
                    }
                  />
                  <Input
                    placeholder="Learning hours"
                    value={newModule.learning_hours}
                    onChange={(event) =>
                      setNewModule((prev) => ({ ...prev, learning_hours: event.target.value }))
                    }
                  />
                </form>

                <DataTable
                  columns={moduleColumns}
                  data={modulesQuery.data}
                  isLoading={modulesQuery.isLoading}
                  isFetching={modulesQuery.isFetching}
                  error={modulesQuery.error}
                  emptyTitle="No modules"
                  emptyDescription="Add modules for curriculum assignment."
                />
              </CardContent>
            </Card>
          ) : null}

          {selectedLevel ? (
            <Card>
              <CardHeader>
                <CardTitle>Batches for level {selectedLevel.level_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="grid gap-2 md:grid-cols-[160px_140px_120px_1fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createBatch.mutate(
                      {
                        occupation_id: selectedOccupationId,
                        academic_year_id: asNumber(newBatch.academic_year_id),
                        level_id: asNumber(newBatch.level_id || selectedLevel.level_id),
                        track_type: toTrackType(newBatch.track_type),
                        capacity: asNumber(newBatch.capacity),
                      },
                      {
                        onSuccess: () =>
                          setNewBatch({
                            academic_year_id: '',
                            level_id: String(selectedLevel.level_id),
                            track_type: 'REGULAR',
                            capacity: '',
                          }),
                      }
                    );
                  }}
                >
                  <select
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={newBatch.academic_year_id}
                    onChange={(event) =>
                      setNewBatch((prev) => ({ ...prev, academic_year_id: event.target.value }))
                    }
                  >
                    <option value="">Select academic year</option>
                    {(academicYearsQuery.data || []).map((year) => (
                      <option key={year.academic_year_id} value={year.academic_year_id}>
                        {year.academic_year_label}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Level id"
                    value={newBatch.level_id || String(selectedLevel.level_id)}
                    onChange={(event) =>
                      setNewBatch((prev) => ({ ...prev, level_id: event.target.value }))
                    }
                  />
                  <select
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={newBatch.track_type}
                    onChange={(event) =>
                      setNewBatch((prev) => ({ ...prev, track_type: event.target.value }))
                    }
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="EXTENSION">Extension</option>
                  </select>
                  <Input
                    placeholder="Capacity"
                    value={newBatch.capacity}
                    onChange={(event) =>
                      setNewBatch((prev) => ({ ...prev, capacity: event.target.value }))
                    }
                  />
                  <Button type="submit" size="sm">
                    Add batch
                  </Button>
                </form>

                <DataTable
                  columns={batchColumns}
                  data={batchesQuery.data}
                  isLoading={batchesQuery.isLoading}
                  isFetching={batchesQuery.isFetching}
                  error={batchesQuery.error}
                  emptyTitle="No batches"
                  emptyDescription="Create a batch to assign curriculum modules."
                />
              </CardContent>
            </Card>
          ) : null}

          {selectedBatch ? (
            <Card>
              <CardHeader>
                <CardTitle>Curriculum for {selectedBatch.batch_code}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <form
                  className="grid gap-2 md:grid-cols-[1fr_120px_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();

                    addCurriculumEntry.mutate(
                      {
                        occupation_id: selectedBatch.occupation_id,
                        level_id: selectedBatch.level_id,
                        m_code: asText(newCurriculum.m_code).toUpperCase(),
                        semester: asNumber(newCurriculum.semester, 1),
                      },
                      {
                        onSuccess: () => setNewCurriculum({ m_code: '', semester: '1' }),
                      }
                    );
                  }}
                >
                  <select
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    value={newCurriculum.m_code}
                    onChange={(event) =>
                      setNewCurriculum((prev) => ({ ...prev, m_code: event.target.value }))
                    }
                  >
                    <option value="">Select module</option>
                    {(modulesQuery.data || []).map((moduleItem) => (
                      <option key={moduleItem.module_id} value={moduleItem.m_code}>
                        {moduleItem.m_code} - {moduleItem.unit_competency}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="Semester"
                    value={newCurriculum.semester}
                    onChange={(event) =>
                      setNewCurriculum((prev) => ({ ...prev, semester: event.target.value }))
                    }
                  />
                  <Button type="submit" size="sm">
                    Assign module
                  </Button>
                </form>

                <DataTable
                  columns={curriculumColumns}
                  data={curriculumQuery.data}
                  isLoading={curriculumQuery.isLoading}
                  isFetching={curriculumQuery.isFetching}
                  error={curriculumQuery.error}
                  emptyTitle="No curriculum modules"
                  emptyDescription="Assign modules to build the batch curriculum."
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Academic years</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                className="grid gap-2 md:grid-cols-[170px_150px_150px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  createAcademicYear.mutate(
                    {
                      academic_year_label: asText(newAcademicYear.academic_year_label),
                      start_date: newAcademicYear.start_date,
                      end_date: newAcademicYear.end_date,
                    },
                    {
                      onSuccess: () =>
                        setNewAcademicYear({
                          academic_year_label: '',
                          start_date: '',
                          end_date: '',
                        }),
                    }
                  );
                }}
              >
                <Input
                  placeholder="Academic year label"
                  value={newAcademicYear.academic_year_label}
                  onChange={(event) =>
                    setNewAcademicYear((prev) => ({
                      ...prev,
                      academic_year_label: event.target.value,
                    }))
                  }
                />
                <Input
                  type="date"
                  value={newAcademicYear.start_date}
                  onChange={(event) =>
                    setNewAcademicYear((prev) => ({ ...prev, start_date: event.target.value }))
                  }
                />
                <Input
                  type="date"
                  value={newAcademicYear.end_date}
                  onChange={(event) =>
                    setNewAcademicYear((prev) => ({ ...prev, end_date: event.target.value }))
                  }
                />
                <Button type="submit" size="sm">
                  Add academic year
                </Button>
              </form>

              <DataTable
                columns={[
                  { accessorKey: 'academic_year_id', header: 'Id' },
                  { accessorKey: 'academic_year_label', header: 'Label' },
                  { accessorKey: 'start_date', header: 'Start date' },
                  { accessorKey: 'end_date', header: 'End date' },
                ]}
                data={academicYearsQuery.data}
                isLoading={academicYearsQuery.isLoading}
                isFetching={academicYearsQuery.isFetching}
                error={academicYearsQuery.error}
                emptyTitle="No academic years"
                emptyDescription="Create an academic year for batch scheduling."
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error.message || 'Failed to load explorer data.'}
        </div>
      ) : null}
    </div>
  );
}
