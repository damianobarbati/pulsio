import { type ColumnDef, columnSizingFeature, tableFeatures, useTable } from '@tanstack/react-table';
import React from 'react';

export const virtualizedTableFeatures = tableFeatures({ columnSizingFeature });

const rowHeight = 64;
const overscan = 8;

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
  const [scrollTop, setScrollTop] = React.useState(0);
  const [viewportHeight, setViewportHeight] = React.useState(0);
  const table = useTable({ data, columns, features: virtualizedTableFeatures, getRowId });
  const rows = table.getRowModel().rows;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(rows.length, startIndex + Math.ceil(viewportHeight / rowHeight) + overscan * 2);
  const visibleRows = rows.slice(startIndex, endIndex);
  const requestedLengthRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => setViewportHeight(element.clientHeight));
    observer.observe(element);
    setViewportHeight(element.clientHeight);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!rows.length || loading) return;
    if (endIndex >= rows.length - 5 && requestedLengthRef.current !== rows.length) {
      requestedLengthRef.current = rows.length;
      onEndReached?.();
    }
  }, [endIndex, rows.length, onEndReached, loading]);

  return (
    <div ref={parentRef} className="h-full min-w-0 overflow-auto" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
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
                  <th key={header.id} className="h-10 truncate border-pulsio-line border-b px-4 font-normal">
                    {header.isPlaceholder ? null : sortable ? (
                      <span className="inline-flex w-full cursor-pointer items-center gap-1 text-left hover:text-slate-900" onClick={() => onSort?.(header.id)}>
                        <table.FlexRender header={header} />
                        {sort?.id === header.id ? <span aria-hidden="true">{sort.direction === 'asc' ? '↑' : '↓'}</span> : null}
                      </span>
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
          {startIndex > 0 ? (
            <tr aria-hidden="true" style={{ height: `${startIndex * rowHeight}px` }}>
              <td colSpan={columns.length} className="p-0" />
            </tr>
          ) : null}
          {visibleRows.map((row) => (
            <tr key={row.id} className={`group h-10 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-pulsio-surface' : ''}`} onClick={() => onRowClick?.(row.original)}>
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className="truncate border-pulsio-line border-b px-4 py-2 align-middle">
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
          {endIndex < rows.length ? (
            <tr aria-hidden="true" style={{ height: `${(rows.length - endIndex) * rowHeight}px` }}>
              <td colSpan={columns.length} className="p-0" />
            </tr>
          ) : null}
        </tbody>
      </table>
      {!data.length && !loading ? <p className="p-8 text-pulsio-muted">{emptyMessage}</p> : null}
      {loading ? <p className="p-5 text-center text-pulsio-muted">Loading more…</p> : null}
    </div>
  );
};
