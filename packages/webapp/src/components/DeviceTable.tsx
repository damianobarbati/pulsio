import cx from 'clsx-tw';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { IAnalytics } from 'types/Analytics.ts';
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

const columns = (tab: DeviceTab, locale: string, translate: (key: string) => string): TableColumn<IAnalytics.demographicsResponse[number]>[] => [
  {
    key: 'name',
    header: translate('device.name'),
    render: (row) => (
      <span className="flex items-center gap-2">
        {tab === 'browser' && getBrowserIcon(row.name)}
        {tab === 'os' && getOsIcon(row.name)}
        {tab === 'device' && getDeviceIcon(row.name)}
        {row.name}
      </span>
    ),
  },
  {
    key: 'users',
    header: translate('device.users'),
    render: (row) => `${toNumber(row.users, '', locale)} (${toRate(row.percentage, '', locale)})`,
    className: 'text-right ',
  },
];

export const DeviceTable = ({ className, domains, from, to }: DeviceDemographicsProps) => {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = React.useState<DeviceTab>('browser');
  const dimension = tab as IAnalytics.demographicsDimension;
  const report = useSWR<IAnalytics.demographicsResponse>(domains.length ? ['/analytics/demographics', { domains, from, to, dimension }] : null, POST, { keepPreviousData: true });
  const rows = report.data ?? [];

  return (
    <section className={cx('h-[402px] overflow-hidden rounded-sm border border-pulsio-line bg-white shadow-pulsio', className)}>
      <div className="flex h-[45px] items-end gap-4 overflow-x-auto border-pulsio-line border-b px-5" role="tablist" aria-label={t('device.demographics')}>
        {(['browser', 'os', 'device'] as DeviceTab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cx(
              'whitespace-nowrap border-b-2 pb-3 font-semibold text-xs uppercase',
              tab === value ? 'border-(--home-primary-color) text-(--home-primary-color)' : 'border-transparent text-pulsio-muted',
            )}
          >
            {value === 'browser' ? t('device.browsers') : value === 'os' ? t('device.operatingSystem') : t('device.device')}
          </button>
        ))}
      </div>
      <div className="h-[355px] min-h-0 overflow-x-auto [&_td]:h-[35px] [&_td]:py-0 [&_th]:h-[40px] [&_th]:py-0">
        {report.isLoading && !report.data ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : report.error ? (
          <p className="px-4 py-10 text-center text-red-600 text-sm">{t('device.loadError')}</p>
        ) : (
          <Table
            columns={columns(tab, i18n.language, t)}
            data={rows.slice(0, 9)}
            getRowKey={(row) => row.name}
            emptyMessage={t('device.empty')}
            bar={{ getPercentage: (row) => row.percentage }}
          />
        )}
      </div>
    </section>
  );
};
