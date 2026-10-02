import { describe, expect, it } from 'vitest';
import { createLocationMapOption } from '#webapp/components/LocationTable.tsx';

describe('createLocationMapOption', () => {
  it('uses the dashboard color for the heat map and varies its intensity', () => {
    const option = createLocationMapOption({
      max: 100,
      primaryColor: '#123456',
      rows: [
        { name: 'US', users: 100, percentage: 1 },
        { name: 'IT', users: 25, percentage: 0.25 },
      ],
    });

    expect(option).toMatchObject({
      visualMap: {
        min: 0,
        max: 100,
        inRange: { color: ['#123456', '#123456'], colorAlpha: [0.12, 1] },
      },
      series: [
        {
          itemStyle: { borderColor: '#fff', borderWidth: 0.5 },
          emphasis: { itemStyle: { areaColor: '#123456' } },
          data: [
            { name: 'United States of America', value: 100 },
            { name: 'Italy', value: 25 },
          ],
        },
      ],
    });
  });
});
