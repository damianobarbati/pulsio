import cx from 'clsx-tw';
import type { EChartsCoreOption } from 'echarts/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { IAnalytics } from 'types/Analytics.ts';
import { Spinner, Table, type TableColumn } from 'ui';
import { POST } from 'ui/api/fetchers.ts';
import { Chart } from 'ui/component/Chart.tsx';
import { IGlobe } from 'ui/icons.tsx';
import { toNumber, toRate } from '#webapp/helpers.ts';

type LocationDemographicsProps = {
  className?: string;
  domains: string[];
  from: string;
  primaryColor?: string;
  to: string;
};

type LocationTab = 'map' | 'country' | 'region' | 'city';
type MapRow = IAnalytics.demographicsResponse[number];
type MapOptionInput = { max: number; primaryColor: string; rows: MapRow[] };

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
const fetchMap = async (path: string) => {
  const response = await fetch(path);
  const data = await response.json();
  return data;
};
const dimensionForTab: Record<Exclude<LocationTab, 'map'>, IAnalytics.demographicsDimension> = { country: 'country', region: 'region', city: 'city' };
const labelForCountry = (name: string) => (/^[A-Z]{2}$/.test(name) ? countryNames.of(name) || name : name);
const mapNameForCountry = (name: string) => (name === 'US' ? 'United States of America' : labelForCountry(name));
export const createLocationMapOption = ({ max, primaryColor, rows }: MapOptionInput): EChartsCoreOption => ({
  tooltip: { trigger: 'item', renderMode: 'richText' },
  visualMap: {
    show: false,
    min: 0,
    max,
    inRange: { color: [primaryColor, primaryColor], colorAlpha: [0.12, 1] },
  },
  series: [
    {
      type: 'map',
      map: 'world',
      roam: false,
      zoom: 1.1,
      top: 30,
      bottom: 15,
      itemStyle: { borderColor: '#fff', borderWidth: 0.5 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: primaryColor } },
      data: rows.map((row) => ({ name: mapNameForCountry(row.name), value: row.users })),
    },
  ],
});
const columns = (tab: LocationTab, locale: string, translate: (key: string) => string): TableColumn<IAnalytics.demographicsResponse[number]>[] => [
  {
    key: 'name',
    header: translate('location.name'),
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
  {
    key: 'users',
    header: translate('location.users'),
    render: (row) => `${toNumber(row.users, '', locale)} (${toRate(row.percentage, '', locale)})`,
    className: 'text-right ',
  },
];

export const LocationTable = ({ className, domains, from, primaryColor = '#055dfe', to }: LocationDemographicsProps) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = React.useState<LocationTab>('map');
  const dimension = tab === 'map' ? 'country' : dimensionForTab[tab];
  const report = useSWR<IAnalytics.demographicsResponse>(domains.length ? ['/analytics/demographics', { domains, from, to, dimension }] : null, POST, { keepPreviousData: true });
  const map = useSWR('/world.json', fetchMap);
  const rows = report.data ?? [];
  const max = Math.max(1, ...rows.map((row) => row.users));
  const mapOption = createLocationMapOption({ max, primaryColor, rows });

  return (
    <section className={cx('h-[402px] overflow-hidden rounded-sm border border-pulsio-line bg-white shadow-pulsio', className)}>
      <div className="flex h-[45px] flex-wrap items-center justify-between gap-3 border-pulsio-line border-b px-5">
        <div className="flex h-full items-end gap-4" role="tablist" aria-label={t('location.demographics')}>
          {(['map', 'country', 'region', 'city'] as LocationTab[]).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={cx(
                'border-b-2 pb-3 font-semibold text-xs uppercase',
                tab === value ? 'border-(--home-primary-color) text-(--home-primary-color)' : 'border-transparent text-pulsio-muted',
              )}
            >
              {value === 'map' ? t('location.worldMap') : value === 'country' ? t('location.countries') : value === 'region' ? t('location.regions') : t('location.cities')}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[355px] min-h-0 overflow-x-auto [&_td]:h-[35px] [&_td]:py-0 [&_th]:h-[40px] [&_th]:py-0">
        {report.isLoading && !report.data ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : report.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">{t('location.loadError')}</p>
        ) : tab === 'map' ? (
          map.data ? (
            <Chart className="h-[355px]" label={t('location.usersByCountry')} map={map.data} option={mapOption} />
          ) : (
            <Spinner size="lg" />
          )
        ) : (
          <Table
            columns={columns(tab, i18n.language, t)}
            data={rows.slice(0, 9)}
            getRowKey={(row) => row.name}
            emptyMessage={t('location.empty')}
            bar={{ getPercentage: (row) => row.percentage }}
          />
        )}
      </div>
    </section>
  );
};
