import cx from 'clsx-tw';
import type { EChartsCoreOption } from 'echarts/core';
import React from 'react';
import useSWR from 'swr';
import type { AnalyticsDemographicsDimension, AnalyticsDemographicsResponse } from 'types/Analytics.ts';
import { Spinner, Table, type TableColumn } from 'ui';
import { POST } from 'ui/api/fetchers.ts';
import { Chart } from 'ui/component/Chart.tsx';
import { IGlobe } from 'ui/icons.tsx';
import { toNumber, toRate } from '#webapp/helpers.ts';

type LocationDemographicsProps = {
  className?: string;
  domains: string[];
  from: string;
  to: string;
};

type LocationTab = 'map' | 'country' | 'region' | 'city';

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const fetchMap = async (path: string) => {
  const response = await fetch(path);
  const data = await response.json();
  return data;
};
const dimensionForTab: Record<Exclude<LocationTab, 'map'>, AnalyticsDemographicsDimension> = { country: 'country', region: 'region', city: 'city' };
const labelForCountry = (name: string) => (/^[A-Z]{2}$/.test(name) ? countryNames.of(name) || name : name);
const mapNameForCountry = (name: string) => (name === 'US' ? 'United States of America' : labelForCountry(name));
const columns = (tab: LocationTab): TableColumn<AnalyticsDemographicsResponse[number]>[] => [
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <span className="flex items-center gap-2">
        {tab === 'country' && row.name.length === 2 ? (
          <span aria-label={labelForCountry(row.name)} role="img">
            {String.fromCodePoint(
              ...row.name
                .toUpperCase()
                .split('')
                .map((letter) => letter.charCodeAt(0) + 127397),
            )}
          </span>
        ) : (
          <IGlobe className="text-gray-400" aria-hidden="true" />
        )}
        {labelForCountry(row.name)}
      </span>
    ),
  },
  { key: 'users', header: 'Users', render: (row) => `${toNumber(row.users)} (${toRate(row.percentage)})`, className: 'text-right tabular-nums' },
];

export const LocationTable = ({ className, domains, from, to }: LocationDemographicsProps) => {
  const [tab, setTab] = React.useState<LocationTab>('map');
  const dimension = tab === 'map' ? 'country' : dimensionForTab[tab];
  const report = useSWR<AnalyticsDemographicsResponse>(domains.length ? ['/analytics/demographics', { domains, from, to, dimension }] : null, POST, { keepPreviousData: true });
  const map = useSWR('/world.json', fetchMap);
  const rows = report.data ?? [];
  const max = Math.max(1, ...rows.map((row) => row.users));
  const tabLabels: Record<LocationTab, string> = { map: 'World map', country: 'Countries', region: 'Regions', city: 'Cities' };
  const mapOption: EChartsCoreOption = {
    tooltip: { trigger: 'item', renderMode: 'richText' },
    visualMap: { show: false, min: 0, max, inRange: { color: ['#e0e7ff', '#8584fa'] } },
    series: [
      {
        type: 'map',
        map: 'world',
        roam: false,
        zoom: 1.1,
        top: 30,
        bottom: 15,
        itemStyle: { borderColor: '#fff', borderWidth: 0.5, areaColor: '#e0e7ff' },
        emphasis: { label: { show: false }, itemStyle: { areaColor: '#a5a3fc' } },
        data: rows.map((row) => ({ name: mapNameForCountry(row.name), value: row.users })),
      },
    ],
  };

  return (
    <section className={cx('mt-4 h-full overflow-hidden rounded-lg border border-pulsio-line bg-white shadow-pulsio', className)}>
      <div className="flex min-h-13 flex-wrap items-center justify-between gap-3 border-pulsio-line border-b px-5 pt-3">
        <div className="flex gap-4" role="tablist" aria-label="Location demographics">
          {(['map', 'country', 'region', 'city'] as LocationTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cx('border-b-2 pb-1 font-semibold text-xs uppercase', tab === value ? 'border-pulsio-blue text-pulsio-blue' : 'border-transparent text-pulsio-muted')}
            >
              {tabLabels[value]}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 overflow-x-auto">
        {report.isLoading && !report.data ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : report.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">Could not load location demographics. Please try again.</p>
        ) : tab === 'map' ? (
          map.data ? (
            <Chart className="h-[360px]" label="Users by country" map={map.data} option={mapOption} />
          ) : (
            <Spinner size="lg" />
          )
        ) : (
          <Table
            columns={columns(tab)}
            data={rows.slice(0, 10)}
            getRowKey={(row) => row.name}
            emptyMessage="No data for this period."
            bar={{ getPercentage: (row) => row.percentage }}
          />
        )}
      </div>
    </section>
  );
};
