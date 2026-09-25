import cx from 'clsx-tw';
import { Chart } from '#ui/component/Chart.tsx';

type ChartLineProps = {
  className?: string;
  label?: string;
  data: { timestamp: string; value: number }[];
  compareData?: { timestamp: string; value: number }[];
  interval: 'hour' | 'day' | 'week' | 'month';
  valueFormatter: (value: any) => string;
};

export const ChartLine = ({ className, label = '', interval, data, compareData, valueFormatter }: ChartLineProps) => {
  const timeseries = data.map((point) =>
    new Date(point.timestamp).toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', ...(interval === 'hour' ? { hour: '2-digit' } : {}) }),
  );

  const timeseriesValues = data.map((point) => point.value);
  const compareValues = data.map((_point, index) => compareData?.[index]?.value ?? null);

  return (
    <div className={cx('relative', className)}>
      <Chart
        label={label}
        className="h-full w-full"
        option={{
          animation: true,
          animationDuration: 0,
          animationDurationUpdate: 450,
          animationEasingUpdate: 'cubicOut',
          color: ['#7064ff', '#85858e'],
          textStyle: { fontFamily: 'Inter, system-ui, sans-serif' },
          grid: { left: 45, right: 10, top: 20, bottom: 40 },
          tooltip: { trigger: 'axis', renderMode: 'richText' },
          yAxis: {
            type: 'value',
            min: 0,
            splitNumber: 6,
            axisLabel: { color: '#85858e' },
            splitLine: { lineStyle: { color: '#ededf1' } },
          },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            axisLine: { lineStyle: { color: '#d4d4da' } },
            axisLabel: { color: '#85858e', margin: 15 },
            data: timeseries,
          },
          series: [
            {
              name: 'Current period',
              type: 'line',
              showSymbol: false,
              connectNulls: false,
              lineStyle: { width: 2 },
              areaStyle: { color: '#055dfe', opacity: 0.2 },
              data: timeseriesValues,
              tooltip: {
                trigger: 'axis',
                renderMode: 'richText',
                valueFormatter,
              },
            },
            ...(compareData
              ? [
                  {
                    name: 'Previous period',
                    type: 'line' as const,
                    showSymbol: false,
                    connectNulls: false,
                    lineStyle: { width: 2, type: 'dashed' as const },
                    data: compareValues,
                    tooltip: {
                      trigger: 'axis' as const,
                      renderMode: 'richText' as const,
                      valueFormatter,
                    },
                  },
                ]
              : []),
          ],
        }}
      />
      {timeseriesValues.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-center text-gray-400 text-sm">No events in this period.</p>}
    </div>
  );
};
