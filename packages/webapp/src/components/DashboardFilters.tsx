import dayjs from 'dayjs';
import * as React from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { IDomain } from 'types/Domain.ts';
import { POST } from 'ui/api/fetchers.ts';
import { Checkbox, Select, SelectMulti } from 'ui/form';
import { ICalendar, IGlobe } from 'ui/icons.tsx';
import { useLocation, useSearch } from 'wouter';

type DashboardFiltersProps = { className?: string; onChange: (filters: DashboardFilterValues) => void };

const periodKeys = ['today', 'yesterday', 'last7Days', 'last30Days', 'last90Days', 'last12Months', 'monthToDate', 'yearToDate', 'allTime'] as const;

type PeriodKey = (typeof periodKeys)[number];

export type DashboardFilterValues = {
  domains: string[];
  from: string;
  to: string;
  compare: boolean;
};

type DashboardFormValues = DashboardFilterValues & { period: PeriodKey };

const defaultPeriod = 'allTime' as const;

const getPeriodRange = (period: PeriodKey) => {
  const now = dayjs();
  const periods: Record<PeriodKey, { from: dayjs.Dayjs; to: dayjs.Dayjs }> = {
    today: { from: now.startOf('day'), to: now.endOf('day') },
    yesterday: { from: now.subtract(1, 'day').startOf('day'), to: now.subtract(1, 'day').endOf('day') },
    last7Days: { from: now.startOf('day').subtract(6, 'day'), to: now.endOf('day') },
    last30Days: { from: now.startOf('day').subtract(30, 'day'), to: now.endOf('day') },
    last90Days: { from: now.startOf('day').subtract(90, 'day'), to: now.endOf('day') },
    last12Months: { from: now.subtract(11, 'month').startOf('month'), to: now.endOf('day') },
    monthToDate: { from: now.startOf('month'), to: now.endOf('day') },
    yearToDate: { from: now.startOf('year'), to: now.endOf('day') },
    allTime: { from: dayjs('2020-01-01').startOf('day'), to: now.endOf('day') },
  };
  const selectedPeriod = periods[period];

  return { from: selectedPeriod.from.toISOString(), to: selectedPeriod.to.toISOString() };
};

const getPeriod = (value: string | null): PeriodKey => {
  if (value && periodKeys.includes(value as PeriodKey)) return value as PeriodKey;
  return defaultPeriod;
};

const getDefaultValues = ({ search, domainOptions }: { search: string; domainOptions: { value: string }[] }): DashboardFormValues => {
  const searchParams = new URLSearchParams(search);
  const availableDomains = new Set(domainOptions.map((domain) => domain.value));
  const requestedDomains = searchParams
    .getAll('domains')
    .flatMap((value) => value.split(','))
    .filter((domain) => availableDomains.has(domain));
  const domains = searchParams.has('domains') ? requestedDomains : domainOptions.map((domain) => domain.value).slice(0, 1);
  const period = getPeriod(searchParams.get('period'));
  const range = getPeriodRange(period);
  const compare = searchParams.get('compare') === 'true';
  return { domains, ...range, period, compare };
};

const getSyncedSearch = ({ search, domains, period, compare }: { search: string; domains: string[]; period: PeriodKey; compare: boolean }) => {
  const searchParams = new URLSearchParams(search);
  searchParams.delete('domains');
  domains.forEach((domain) => {
    searchParams.append('domains', domain);
  });
  searchParams.set('period', period);
  searchParams.set('compare', String(compare));

  return `?${searchParams.toString()}`;
};

export const DashboardFilters = ({ className, onChange }: DashboardFiltersProps) => {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const domainsSWR = useSWR<IDomain.listResponse>(['/domain/list'], POST, { suspense: true, shouldRetryOnError: false });
  const domainOptions = (domainsSWR.data ?? []).map((domain) => ({ value: domain.domain, label: domain.domain }));
  const defaultValues = getDefaultValues({ search, domainOptions });

  const form = useForm<DashboardFormValues>({ defaultValues });
  const domains = useWatch({ control: form.control, name: 'domains' });
  const period = useWatch({ control: form.control, name: 'period' });
  const compare = useWatch({ control: form.control, name: 'compare' });

  React.useEffect(() => {
    const range = getPeriodRange(period);
    const nextFilters = { domains, ...range, compare };
    form.setValue('from', range.from);
    form.setValue('to', range.to);
    onChange(nextFilters);

    const nextSearch = getSyncedSearch({ search, domains, period, compare });
    if (nextSearch !== search) navigate(`${location}${nextSearch}`, { replace: true });
  }, [compare, domains, form, location, navigate, onChange, period, search]);

  return (
    <FormProvider {...form}>
      <div className={className}>
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <IGlobe className="text-pulsio-blue" size={21} />
            <span className="sr-only">{t('filters.selectedWebsites')}</span>
            <SelectMulti className="w-60" name="domains" options={domainOptions} placeholder={t('filters.selectWebsites')} />
          </label>
          <Select name="period" className="w-54" aria-label={t('filters.datePeriod')} leftIcon={<ICalendar size={18} />}>
            {periodKeys.map((value) => (
              <option key={value} value={value}>
                {t(`periods.${value}`)}
              </option>
            ))}
          </Select>
          <Checkbox name="compare" label={t('filters.compare')} />
        </div>
      </div>
    </FormProvider>
  );
};
