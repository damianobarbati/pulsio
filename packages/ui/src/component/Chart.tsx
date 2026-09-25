import cx from 'clsx-tw';
import { LineChart, MapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { type EChartsCoreOption, getInstanceByDom, init, registerMap, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import * as React from 'react';

use([LineChart, MapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

type ChartProps = {
  className?: string;
  option: EChartsCoreOption;
  label: string;
  map?: Parameters<typeof registerMap>[1];
  onSelect?: (name: string) => void;
};

export const Chart = ({ className, option, label, map, onSelect }: ChartProps) => {
  const container = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!container.current) return;

    const chart = init(container.current);
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container.current);

    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, []);

  React.useEffect(() => {
    if (!container.current) return;

    const chart = getInstanceByDom(container.current);
    if (!chart) return;
    if (map) registerMap('world', map);

    chart.setOption(option);
  }, [option, map]);

  React.useEffect(() => {
    if (!container.current || !onSelect) return;

    const chart = getInstanceByDom(container.current);
    if (!chart) return;

    const handleClick = (event: { name?: string }) => {
      if (event.name) onSelect(event.name);
    };

    chart.on('click', handleClick);
    return () => {
      chart.off('click', handleClick);
    };
  }, [onSelect]);

  return <div ref={container} className={cx('h-96', className)} role="img" aria-label={label} />;
};
