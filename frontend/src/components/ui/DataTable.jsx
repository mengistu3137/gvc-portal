import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDownUp, LoaderCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from './EmptyState';
import { Input } from './input';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

export function DataTable({
  data,
  columns,
  isLoading,
  isFetching,
  error,
  emptyTitle,
  emptyDescription,
  pageSizeOptions = [25, 50, 100],
  initialPageSize = 25,
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState([]);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [pageIndex, setPageIndex] = useState(0);

  const tableData = useMemo(() => data ?? [], [data]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination: { pageIndex, pageSize },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === 'function' ? updater({ pageIndex, pageSize }) : updater;
      setPageIndex(next.pageIndex);
      setPageSize(next.pageSize);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error.message || 'Unable to load records.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Filter records"
          className="max-w-xs"
        />
        {isFetching && !isLoading ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
            <LoaderCircle size={14} className="animate-spin" />
            Syncing data
          </span>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        className="inline-flex items-center gap-1"
                        onClick={header.column.getToggleSortingHandler()}
                        type="button"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowDownUp size={12} className="text-slate-400" />
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {columns.map((column) => (
                      <TableCell key={`${column.accessorKey || column.id}-${index}`}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value);
              setPageSize(nextSize);
              setPageIndex(0);
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-500">
            {table.getFilteredSelectedRowModel().rows.length > 0
              ? `${table.getFilteredSelectedRowModel().rows.length} selected`
              : null}
          </span>
        </div>

        <div className="inline-flex items-center gap-3">
          <span className="text-xs text-slate-500">
            Showing {(pageIndex * pageSize) + 1} - {Math.min((pageIndex + 1) * pageSize, table.getFilteredRowModel().rows.length)} of {table.getFilteredRowModel().rows.length}
          </span>
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded border border-slate-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {pageIndex + 1} of {table.getPageCount() || 1}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded border border-slate-200 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {!isLoading && table.getRowModel().rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
    </div>
  );
}
