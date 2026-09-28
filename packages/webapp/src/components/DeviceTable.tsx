import cx from 'clsx-tw';
import React from 'react';
import useSWR from 'swr';
import type { AnalyticsDemographicsDimension, AnalyticsDemographicsResponse } from 'types/Analytics.ts';
import { Spinner, Table, type TableColumn } from 'ui';
import { POST } from 'ui/api/fetchers.ts';
import {
  IAndroid,
  IApple,
  IBrave,
  IChrome,
  IDesktop,
  IEdge,
  IFirefox,
  IGlobe,
  ILaptop,
  ILinux,
  IMobile,
  IOpera,
  ISafari,
  ISamsung,
  ITablet,
  IUbuntu,
  IWindows,
} from 'ui/icons.tsx';
import { toNumber, toRate } from '#webapp/helpers.ts';

type DeviceDemographicsProps = {
  className?: string;
  domains: string[];
  from: string;
  to: string;
};

type DeviceTab = 'browser' | 'os' | 'device';

const tabLabels: Record<DeviceTab, string> = {
  browser: 'Browsers',
  os: 'Operating system',
  device: 'Device',
};

const getBrowserIcon = (name: string) => {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes('chrome')) return <IChrome className="text-blue-500" aria-hidden="true" />;
  if (normalizedName.includes('firefox')) return <IFirefox className="text-orange-500" aria-hidden="true" />;
  if (normalizedName.includes('safari')) return <ISafari className="text-sky-500" aria-hidden="true" />;
  if (normalizedName.includes('edge')) return <IEdge className="text-cyan-500" aria-hidden="true" />;
  if (normalizedName.includes('opera')) return <IOpera className="text-red-500" aria-hidden="true" />;
  if (normalizedName.includes('brave')) return <IBrave className="text-orange-600" aria-hidden="true" />;
  if (normalizedName.includes('samsung')) return <ISamsung className="text-blue-600" aria-hidden="true" />;
  return <IGlobe className="text-gray-400" aria-hidden="true" />;
};

const getOsIcon = (name: string) => {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes('windows')) return <IWindows className="text-blue-500" aria-hidden="true" />;
  if (normalizedName.includes('mac') || normalizedName.includes('ios') || normalizedName.includes('iphone') || normalizedName.includes('ipad'))
    return <IApple className="text-gray-700" aria-hidden="true" />;
  if (normalizedName.includes('android')) return <IAndroid className="text-green-500" aria-hidden="true" />;
  if (normalizedName.includes('ubuntu')) return <IUbuntu className="text-orange-500" aria-hidden="true" />;
  if (normalizedName.includes('linux')) return <ILinux className="text-gray-700" aria-hidden="true" />;
  return <IGlobe className="text-gray-400" aria-hidden="true" />;
};

const getDeviceIcon = (name: string) => {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes('laptop')) return <ILaptop className="text-slate-600" aria-hidden="true" />;
  if (normalizedName.includes('tablet')) return <ITablet className="text-violet-500" aria-hidden="true" />;
  if (normalizedName.includes('mobile')) return <IMobile className="text-emerald-500" aria-hidden="true" />;
  return <IDesktop className="text-blue-500" aria-hidden="true" />;
};

const columns = (tab: DeviceTab): TableColumn<AnalyticsDemographicsResponse[number]>[] => [
  {
    key: 'name',
    header: 'Name',
    render: (row) => (
      <span className="flex items-center gap-2">
        {tab === 'browser' && getBrowserIcon(row.name)}
        {tab === 'os' && getOsIcon(row.name)}
        {tab === 'device' && getDeviceIcon(row.name)}
        {row.name}
      </span>
    ),
  },
  { key: 'users', header: 'Users', render: (row) => `${toNumber(row.users)} (${toRate(row.percentage)})`, className: 'text-right tabular-nums' },
];

export const DeviceTable = ({ className, domains, from, to }: DeviceDemographicsProps) => {
  const [tab, setTab] = React.useState<DeviceTab>('browser');
  const dimension = tab as AnalyticsDemographicsDimension;
  const report = useSWR<AnalyticsDemographicsResponse>(domains.length ? ['/analytics/demographics', { domains, from, to, dimension }] : null, POST, { keepPreviousData: true });
  const rows = report.data ?? [];

  return (
    <section className={cx('mt-4 h-full overflow-hidden rounded-lg border border-pulsio-line bg-white shadow-pulsio', className)}>
      <div className="flex min-h-13 items-center gap-4 overflow-x-auto border-pulsio-line border-b px-5 pt-3" role="tablist" aria-label="Device demographics">
        {(['browser', 'os', 'device'] as DeviceTab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cx(
              'whitespace-nowrap border-b-2 pb-3 font-semibold text-xs uppercase',
              tab === value ? 'border-pulsio-blue text-pulsio-blue' : 'border-transparent text-pulsio-muted',
            )}
          >
            {tabLabels[value]}
          </button>
        ))}
      </div>
      <div className="min-h-0 overflow-x-auto">
        {report.isLoading && !report.data ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : report.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">Could not load device demographics. Please try again.</p>
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
