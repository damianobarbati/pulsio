import cx from 'clsx-tw';
import type React from 'react';

export type TableColumn<Row> = {
  key: string;
  header: React.ReactNode;
  render: (row: Row) => React.ReactNode;
  className?: string;
};

type TableProps<Row extends object> = {
  className?: string;
  columns: TableColumn<Row>[];
  data: Row[];
  getRowKey: (row: Row) => string;
  emptyMessage?: string;
  bar?: { getPercentage: (row: Row) => number; className?: string };
};

export const Table = <Row extends object>({ className, columns, data, getRowKey, emptyMessage = 'No data found.', bar }: TableProps<Row>) => (
  <table className={cx('w-full text-left text-sm', className)}>
    <thead className="border-pulsio-line border-b text-pulsio-muted">
      <tr>
        {columns.map((column) => (
          <th key={column.key} className={cx('whitespace-nowrap px-4 py-3 font-normal', column.className)}>
            {column.header}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map((row) => {
        const percentage = bar && Math.max(1, Math.min(100, bar.getPercentage(row)));

        return (
          <tr
            key={getRowKey(row)}
            className={cx('border-pulsio-line border-b last:border-0', bar?.className)}
            style={
              percentage
                ? {
                    backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--home-primary-color, #055dfe) 10%, transparent) ${percentage}%, transparent ${percentage}%)`,
                  }
                : undefined
            }
          >
            {columns.map((column) => (
              <td key={column.key} className={cx('relative px-4 py-3', column.className)}>
                <span>{column.render(row)}</span>
              </td>
            ))}
          </tr>
        );
      })}
      {!data.length && (
        <tr>
          <td colSpan={columns.length} className="px-4 py-10 text-center text-pulsio-muted">
            {emptyMessage}
          </td>
        </tr>
      )}
    </tbody>
  </table>
);
