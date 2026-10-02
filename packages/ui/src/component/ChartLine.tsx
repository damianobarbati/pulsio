import cx from 'clsx-tw';
import type { LineSeriesOption } from 'echarts';
import { Chart } from '#ui/component/Chart.tsx';

type ChartLineProps = {
  className?: string;
  label?: string;
  primaryColor?: string;
  data: { timestamp: string; value: number }[];
  compareData?: { timestamp: string; value: number }[];
  interval: 'hour' | 'day' | 'week' | 'month';
  valueFormatter: (value: any) => string;
};

export const ChartLine = ({ className, label = '', primaryColor = '#055dfe', interval, data, compareData, valueFormatter }: ChartLineProps) => {
  const timeseriesY = data.map((point) =>
    new Date(point.timestamp).toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', ...(interval === 'hour' ? { hour: '2-digit' } : {}) }),
  );

  const timeseriesX = data.map((point) => point.value);
  const timeseriesComparisonX = compareData?.map((point) => point.value) ?? [];

  const series: LineSeriesOption[] = [
    {
      name: 'Current period',
      type: 'line',
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2, color: primaryColor },
      areaStyle: { color: primaryColor, opacity: 0.1 },
      data: timeseriesX,
      tooltip: {
        trigger: 'axis',
        valueFormatter,
      },
    },
  ];

  if (compareData?.length) {
    series.push({
      name: 'Previous period',
      type: 'line',
      showSymbol: false,
      connectNulls: false,
      lineStyle: { width: 2, type: 'dotted', color: '#85858e' },
      data: timeseriesComparisonX,
      tooltip: {
        trigger: 'axis',
        valueFormatter,
      },
    });
  }

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
          color: [primaryColor, '#85858e'],
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
            data: timeseriesY,
          },
          series,
        }}
      />
      {timeseriesX.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-center text-gray-400 text-sm">No events in this period.</p>}
    </div>
  );
};
