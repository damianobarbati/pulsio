import { LineChart, MapChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { type EChartsCoreOption, init, registerMap, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import * as React from 'react';

use([LineChart, MapChart, GridComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);
type ChartProps = { option: EChartsCoreOption; label: string; map?: Parameters<typeof registerMap>[1]; onSelect?: (name: string) => void; className?: string };
export const Chart = ({ option, label, map, onSelect, className = 'h-96' }: ChartProps) => {
  const container = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!container.current) return;
    if (map) registerMap('world', map);
    const chart = init(container.current);
    chart.setOption(option);
    if (onSelect)
      chart.on('click', (event) => {
        if (event.name) onSelect(event.name);
      });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [option, map, onSelect]);
  return <div ref={container} className={className} role="img" aria-label={label} />;
};
