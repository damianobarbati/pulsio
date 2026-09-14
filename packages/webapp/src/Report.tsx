import * as React from 'react';
import useSWR from 'swr';
import type { AnalyticsFilter, BreakdownRow, Dimension } from 'types/analytics.ts';
import { Chart } from './Chart.tsx';
import { formatMetric } from './format.ts';
import { IChrome, IExpand, IFirefox, IGithub, IGlobe, IGoogle, ILink, ISafari } from './icons.tsx';
import { fetcher } from './requests.ts';

type ReportProps = {
  query: string;
  tabs: { label: string; dimension: Dimension | 'map' }[];
  initial?: Dimension | 'map';
  color: string;
  onFilter: (filter: AnalyticsFilter) => void;
};
const countryNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const Report = ({ query, tabs, initial, color, onFilter }: ReportProps) => {
  const [dimension, setDimension] = React.useState<Dimension | 'map'>(initial || tabs[0].dimension);
  const [expanded, setExpanded] = React.useState(false);
  const [campaign, setCampaign] = React.useState<Dimension>('utm_campaign');
  const [property, setProperty] = React.useState('');
  const active = dimension === 'utm_campaign' ? campaign : dimension;
  const apiDimension = active === 'map' ? 'country' : active;
  const report = useSWR<BreakdownRow[]>(`/analytics/breakdown?${query}&dimension=${apiDimension}${property ? `&key=${encodeURIComponent(property)}` : ''}`, fetcher);
  const map = useSWR(active === 'map' ? '/world.json' : null, async (url) => await (await fetch(url)).json());
  const rows = report.data || [];
  const max = Math.max(1, ...rows.map((row) => row.value));
  const label = (name: string) => (apiDimension === 'country' && /^[A-Z]{2}$/.test(name) ? countryNames.of(name) || name : name);
  const select = (name: string) => {
    if (apiDimension === 'property' && !property) {
      setProperty(name);
      return;
    }
    onFilter({ dimension: apiDimension, value: name, operator: 'is', key: property || undefined });
    const drill: Partial<Record<Dimension, Dimension>> = { source: 'referrer', browser: 'browser_version', os: 'os_version', country: 'region', region: 'city' };
    if (drill[apiDimension]) setDimension(drill[apiDimension]);
  };
  return (
    <section className={`min-w-0 rounded-lg border border-gray-100 bg-white p-5 shadow-sm sm:p-6 ${expanded ? 'md:col-span-2' : ''}`}>
      <div className="flex min-h-10 items-start justify-between gap-3 border-gray-200 border-b">
        <div className="flex flex-wrap gap-x-4 gap-y-2" role="tablist" aria-label={`${tabs[0].label} reports`}>
          {tabs.map((tab) => (
            <button
              key={tab.dimension}
              type="button"
              role="tab"
              aria-selected={dimension === tab.dimension}
              onClick={() => {
                setDimension(tab.dimension);
                setProperty('');
              }}
              className={`border-b-2 pb-4 font-semibold text-xs uppercase tracking-wide ${dimension === tab.dimension ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {tab.label}
            </button>
          ))}
          {!tabs.some((tab) => tab.dimension === dimension) && (
            <span className="border-gray-800 border-b-2 pb-4 font-semibold text-xs uppercase">{dimension.replaceAll('_', ' ')}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${tabs[0].label} report`}
          className="text-gray-500 hover:text-violet-600"
        >
          <IExpand size={19} />
        </button>
      </div>
      {dimension === 'utm_campaign' && (
        <select
          aria-label="Campaign parameter"
          className="mt-3 rounded border border-gray-200 p-1 text-sm"
          value={campaign}
          onChange={(event) => setCampaign(event.target.value as Dimension)}
        >
          {['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      )}
      {property && (
        <button type="button" className="mt-3 text-sm text-violet-600" onClick={() => setProperty('')}>
          All properties / {property}
        </button>
      )}
      {report.error && (
        <p role="alert" className="py-8 text-red-600">
          {report.error.message}
        </p>
      )}
      {report.isLoading && (
        <p role="status" className="py-16 text-center text-gray-500">
          Loading report…
        </p>
      )}
      {active === 'map' && map.data ? (
        <>
          <Chart
            className="h-[360px]"
            label="Visitors by country. Use the Countries tab for a table."
            map={map.data}
            onSelect={(name) => {
              const row = rows.find((row) => label(row.name) === name || (row.name === 'US' && name === 'United States of America'));
              if (row) select(row.name);
            }}
            option={{
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
                  data: rows.map((row) => ({ name: row.name === 'US' ? 'United States of America' : label(row.name), value: row.value })),
                },
              ],
            }}
          />
          <a className="text-gray-400 text-xs" href="https://db-ip.com" target="_blank" rel="noreferrer">
            IP Geolocation by DB-IP
          </a>
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="mt-4 w-full border-separate border-spacing-y-1 text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="pb-1 font-normal">{property || apiDimension.replaceAll('_', ' ')}</th>
                <th className="pb-1 text-right font-normal">Visitors</th>
                {expanded &&
                  ['Share', 'Pageviews', 'Visits', 'Bounce rate', 'Visit duration', 'Time on page', 'Scroll depth', 'Exit rate'].map((name) => (
                    <th key={name} className="whitespace-nowrap px-3 font-normal">
                      {name}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, expanded ? 100 : 9).map((row) => {
                let Icon = ILink;
                if (row.name === 'Google' || row.name.startsWith('google.')) Icon = IGoogle;
                if (row.name === 'Chrome') Icon = IChrome;
                if (row.name === 'Safari' || row.name === 'Mobile Safari') Icon = ISafari;
                if (row.name === 'Firefox') Icon = IFirefox;
                if (row.name === 'github.com') Icon = IGithub;
                if (['device', 'os', 'browser_version', 'os_version', 'country', 'region', 'city'].includes(apiDimension)) Icon = IGlobe;
                return (
                  <tr key={row.name}>
                    <td className="relative min-w-36 max-w-96">
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 rounded"
                        style={{ width: `${Math.max(1, (row.value / max) * 100)}%`, backgroundColor: color }}
                      />
                      <button
                        type="button"
                        onClick={() => select(row.name)}
                        className="relative flex w-full items-center gap-2 px-2 py-2 text-left hover:text-violet-700"
                        title={`Filter by ${label(row.name)}`}
                      >
                        {!['page', 'entry_page', 'exit_page', 'event', 'property'].includes(apiDimension) && <Icon className="shrink-0 text-gray-500" size={18} />}
                        <span className="truncate">{label(row.name)}</span>
                      </button>
                    </td>
                    <td className="min-w-20 py-2 pl-6 text-right tabular-nums">{formatMetric('visitors', row.value)}</td>
                    {expanded &&
                      [
                        formatMetric('percentage', row.percentage),
                        formatMetric('pageviews', row.pageviews),
                        formatMetric('visits', row.visits),
                        formatMetric('bounceRate', row.bounceRate),
                        formatMetric('visitDuration', row.visitDuration),
                        formatMetric('timeOnPage', row.timeOnPage),
                        formatMetric('scrollDepth', row.scrollDepth),
                        formatMetric('exitRate', row.exitRate),
                      ].map((value, index) => (
                        <td key={['share', 'views', 'visits', 'bounce', 'duration', 'time', 'scroll', 'exit'][index]} className="whitespace-nowrap px-3 tabular-nums">
                          {value}
                        </td>
                      ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!report.isLoading && !report.error && !rows.length && <p className="py-24 text-center text-gray-400">No data for this period.</p>}
        </div>
      )}
    </section>
  );
};
