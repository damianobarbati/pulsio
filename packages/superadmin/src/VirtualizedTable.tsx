import { type ColumnDef, columnSizingFeature, tableFeatures, useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

export const virtualizedTableFeatures = tableFeatures({ columnSizingFeature });

type VirtualizedTableProps<T extends object> = {
  columns: ColumnDef<typeof virtualizedTableFeatures, T>[];
  data: T[];
  getRowId?: (row: T) => string;
  onEndReached?: () => void;
  loading?: boolean;
  emptyMessage: string;
  onRowClick?: (row: T) => void;
  sort?: { id: string; direction: 'asc' | 'desc' };
  onSort?: (id: string) => void;
  sortableColumns?: string[];
};

export const VirtualizedTable = <T extends object>({
  columns,
  data,
  getRowId,
  onEndReached,
  loading,
  emptyMessage,
  onRowClick,
  sort,
  onSort,
  sortableColumns = [],
}: VirtualizedTableProps<T>) => {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const table = useTable({ data, columns, features: virtualizedTableFeatures, getRowId });
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => parentRef.current, estimateSize: () => 64, overscan: 8 });
  const virtualRows = rowVirtualizer.getVirtualItems();
  const requestedRowRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const lastRow = virtualRows.at(-1);
    if (!lastRow || loading) return;
    if (requestedRowRef.current !== null && lastRow.index < requestedRowRef.current) requestedRowRef.current = null;
    if (lastRow.index >= rows.length - 5 && requestedRowRef.current !== lastRow.index) {
      requestedRowRef.current = lastRow.index;
      onEndReached?.();
    }
  }, [virtualRows, rows.length, onEndReached, loading]);

  return (
    <div ref={parentRef} className="h-full min-w-0 overflow-auto">
      <table className="table-fixed border-separate border-spacing-0 text-left text-sm" style={{ width: `max(100%, ${table.getTotalSize()}px)` }}>
        <colgroup>
          {table.getFlatHeaders().map((header) => (
            <col key={header.id} style={{ width: `${header.getSize()}px` }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-[1] bg-white text-pulsio-muted">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortable = sortableColumns.includes(header.id);
                return (
                  <th key={header.id} className="h-10 truncate border-pulsio-line border-b px-4 font-medium">
                    {header.isPlaceholder ? null : sortable ? (
                      <button type="button" className="inline-flex w-full items-center gap-1 text-left hover:text-slate-900" onClick={() => onSort?.(header.id)}>
                        <table.FlexRender header={header} />
                        {sort?.id === header.id ? <span aria-hidden="true">{sort.direction === 'asc' ? '↑' : '↓'}</span> : null}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {virtualRows.length ? <tr style={{ height: `${virtualRows[0]?.start || 0}px` }} /> : null}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <tr
                key={row.id}
                data-index={virtualRow.index}
                ref={(node) => rowVirtualizer.measureElement(node)}
                className={`group transition-colors ${onRowClick ? 'cursor-pointer hover:bg-pulsio-surface' : ''}`}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="truncate border-pulsio-line border-b px-4 py-2 align-middle">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            );
          })}
          {virtualRows.length ? <tr style={{ height: `${rowVirtualizer.getTotalSize() - (virtualRows.at(-1)?.end || 0)}px` }} /> : null}
        </tbody>
      </table>
      {!data.length && !loading ? <p className="p-8 text-pulsio-muted">{emptyMessage}</p> : null}
      {loading ? <p className="p-5 text-center text-pulsio-muted">Loading more…</p> : null}
    </div>
  );
};
