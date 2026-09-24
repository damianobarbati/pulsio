import * as React from 'react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { Button, Input, MultiSelect } from 'ui';
import { ICalendar, IClose, IFilter, IGlobe } from 'ui/icons.tsx';
import { deleteMutation, fetcher, mutation } from '../api.ts';

export type AnalyticsFilter = { dimension: string; operator: 'is' | 'is_not' | 'contains'; value: string; key?: string };
type FilterPreset = { id: string; name: string; site_ids: string[]; from_date: string; to_date: string; filters: AnalyticsFilter[] };
type SiteGroup = { id: string; name: string; site_ids: string[] };
type Site = { id: string; domain: string };
type FilterForm = { dimension: string; operator: AnalyticsFilter['operator']; value: string; key: string };
type NameForm = { name: string };
type DashboardFiltersProps = {
  sites: Site[];
  siteIds: string[];
  onSite: (siteId: string) => void;
  onSiteIdsChange: (siteIds: string[]) => void;
  from: string;
  to: string;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
  filters: AnalyticsFilter[];
  onFilterAdd: (filter: AnalyticsFilter) => void;
  onFiltersChange: (filters: AnalyticsFilter[]) => void;
  goal: string;
  onGoalChange: (goal: string) => void;
};

const date = (value: number) => new Date(value).toISOString().slice(0, 10);

export const DashboardFilters = ({
  sites,
  siteIds,
  onSite,
  onSiteIdsChange,
  from,
  to,
  onFromChange,
  onToChange,
  filters,
  onFilterAdd,
  onFiltersChange,
  goal,
  onGoalChange,
}: DashboardFiltersProps) => {
  const [days, setDays] = React.useState('28');
  const [isSavingGroup, setIsSavingGroup] = React.useState(false);
  const [showFilters, setShowFilters] = React.useState(false);
  const [isSavingPreset, setIsSavingPreset] = React.useState(false);
  const [showDates, setShowDates] = React.useState(false);
  const [mutationMessage, setMutationMessage] = React.useState('');
  const defaultSiteId = React.useRef(siteIds[0]);
  const defaultFrom = React.useRef(from);
  const defaultTo = React.useRef(to);
  const filterForm = useForm<FilterForm>({ defaultValues: { dimension: 'page', operator: 'is', value: '', key: '' } });
  const groupForm = useForm<NameForm>({ defaultValues: { name: '' } });
  const presetForm = useForm<NameForm>({ defaultValues: { name: '' } });
  const groups = useSWR<SiteGroup[]>('/site-groups', fetcher);
  const presets = useSWR<FilterPreset[]>('/filter-presets', fetcher);
  const saveGroup = useSWRMutation('/site-groups', mutation);
  const savePreset = useSWRMutation('/filter-presets', mutation);
  const removeGroup = useSWRMutation('/site-groups', deleteMutation);
  const removePreset = useSWRMutation('/filter-presets', deleteMutation);
  const canSaveGroup = siteIds.length >= 2 && (groups.data?.length ?? 0) < 5;
  const hasPresetChanges = siteIds.length !== 1 || siteIds[0] !== defaultSiteId.current || from !== defaultFrom.current || to !== defaultTo.current || filters.length > 0;
  const selectSites = (nextSiteIds: string[]) => {
    if (!nextSiteIds.length) return;
    onSiteIdsChange(nextSiteIds);
    onSite(nextSiteIds[0]);
    onFiltersChange([]);
    onGoalChange('');
  };
  const saveSelection = groupForm.handleSubmit(async ({ name }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      await saveGroup.trigger({ name: trimmedName, site_ids: siteIds });
      groupForm.reset();
      setIsSavingGroup(false);
      await groups.mutate();
    } catch (error) {
      setMutationMessage(error instanceof Error ? error.message : 'Could not save website group.');
    }
  });
  const saveFilterPreset = presetForm.handleSubmit(async ({ name }) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    try {
      await savePreset.trigger({ name: trimmedName, site_ids: siteIds, from_date: from, to_date: to, filters });
      presetForm.reset();
      setIsSavingPreset(false);
      await presets.mutate();
    } catch (error) {
      setMutationMessage(error instanceof Error ? error.message : 'Could not save filter preset.');
    }
  });
  const applyPreset = (preset: FilterPreset) => {
    const availableSiteIds = preset.site_ids.filter((siteId) => sites.some((site) => site.id === siteId));
    if (!availableSiteIds.length) return;
    onSiteIdsChange(availableSiteIds);
    onSite(availableSiteIds[0]);
    onFromChange(preset.from_date);
    onToChange(preset.to_date);
    setDays('custom');
    onFiltersChange(preset.filters);
    onGoalChange('');
  };
  const applyFilter = filterForm.handleSubmit((input) => {
    onFilterAdd({ ...input, key: input.key || undefined });
    setShowFilters(false);
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">
            <IGlobe className="text-violet-500" size={21} />
            <span className="sr-only">Selected websites</span>
            <MultiSelect
              options={sites.map((site) => ({ value: site.id, label: site.domain }))}
              value={siteIds}
              onChange={selectSites}
              placeholder="Select websites"
              className="w-72"
            />
          </label>
          {canSaveGroup && !isSavingGroup && (
            <Button variant="secondary" size="sm" onClick={() => setIsSavingGroup(true)}>
              Save selection
            </Button>
          )}
          {canSaveGroup && isSavingGroup && (
            <form onSubmit={saveSelection} className="flex items-center gap-2">
              <Input aria-label="Group name" {...groupForm.register('name')} maxLength={40} placeholder="Group name" className="w-36" />
              <Button type="submit" size="sm" disabled={saveGroup.isMutating || !groupForm.watch('name').trim()}>
                Save
              </Button>
              <button type="button" onClick={() => setIsSavingGroup(false)} className="text-gray-500">
                Cancel
              </button>
            </form>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowDates(!showDates)} aria-expanded={showDates}>
            <ICalendar size={18} />
            {days === 'custom' ? `${from} – ${to}` : `Last ${days} days`}
          </Button>
          <button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-sm" aria-expanded={showFilters}>
            <IFilter size={18} /> Filters
          </button>
          {hasPresetChanges && !isSavingPreset && (
            <Button variant="secondary" size="sm" onClick={() => setIsSavingPreset(true)}>
              Save preset
            </Button>
          )}
          {hasPresetChanges && isSavingPreset && (
            <form onSubmit={saveFilterPreset} className="flex items-center gap-2">
              <Input aria-label="Preset name" {...presetForm.register('name')} maxLength={40} placeholder="Preset name" className="w-36" />
              <Button type="submit" size="sm" disabled={savePreset.isMutating || !presetForm.watch('name').trim()}>
                Save
              </Button>
              <button type="button" onClick={() => setIsSavingPreset(false)} className="text-gray-500">
                Cancel
              </button>
            </form>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {(Array.isArray(groups.data) ? groups.data : []).map((group) => (
            <span key={group.id} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-violet-800">
              <button type="button" onClick={() => selectSites(group.site_ids.filter((siteId) => sites.some((site) => site.id === siteId)))}>
                {group.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${group.name} group`}
                onClick={async () => {
                  try {
                    await removeGroup.trigger({ id: group.id });
                    await groups.mutate();
                  } catch (error) {
                    setMutationMessage(error instanceof Error ? error.message : 'Could not delete website group.');
                  }
                }}
                className="font-semibold"
              >
                ×
              </button>
            </span>
          ))}
          {(Array.isArray(presets.data) ? presets.data : []).map((preset) => (
            <span key={preset.id} className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sky-800">
              <button type="button" onClick={() => applyPreset(preset)}>
                {preset.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${preset.name} preset`}
                onClick={async () => {
                  try {
                    await removePreset.trigger({ id: preset.id });
                    await presets.mutate();
                  } catch (error) {
                    setMutationMessage(error instanceof Error ? error.message : 'Could not delete filter preset.');
                  }
                }}
                className="font-semibold"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>
      {mutationMessage && (
        <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700 text-sm">
          {mutationMessage}
        </p>
      )}
      {showDates && (
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <label>
            Period
            <select
              aria-label="Date period"
              value={days}
              className="mt-1 block rounded border border-gray-200 p-2"
              onChange={(event) => {
                const next = event.target.value;
                setDays(next);
                if (next !== 'custom') {
                  onFromChange(date(Date.now() - (Number(next) - 1) * 86400000));
                  onToChange(date(Date.now()));
                }
              }}
            >
              {['1', '7', '28', '90', '365', 'custom'].map((value) => (
                <option key={value} value={value}>
                  {value === 'custom' ? 'Custom range' : `Last ${value} days`}
                </option>
              ))}
            </select>
          </label>
          <label>
            From
            <input
              aria-label="From date"
              type="date"
              value={from}
              max={to}
              onChange={(event) => {
                if (event.target.value) {
                  onFromChange(event.target.value);
                  setDays('custom');
                }
              }}
              className="mt-1 block rounded border border-gray-200 p-2"
            />
          </label>
          <label>
            To
            <input
              aria-label="To date"
              type="date"
              value={to}
              min={from}
              onChange={(event) => {
                if (event.target.value) {
                  onToChange(event.target.value);
                  setDays('custom');
                }
              }}
              className="mt-1 block rounded border border-gray-200 p-2"
            />
          </label>
          <span className="pb-2 text-gray-400">UTC · compared with the previous period</span>
        </div>
      )}
      {showFilters && (
        <form onSubmit={applyFilter} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <label>
            Dimension
            <select {...filterForm.register('dimension')} className="mt-1 block rounded border border-gray-200 p-2">
              {[
                'page',
                'entry_page',
                'exit_page',
                'source',
                'channel',
                'referrer',
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_content',
                'utm_term',
                'country',
                'region',
                'city',
                'browser',
                'browser_version',
                'os',
                'os_version',
                'device',
                'hostname',
                'property',
                'event',
              ].map((name) => (
                <option key={name} value={name}>
                  {name.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Match
            <select {...filterForm.register('operator')} className="mt-1 block rounded border border-gray-200 p-2">
              <option value="is">is</option>
              <option value="is_not">is not</option>
              <option value="contains">contains</option>
            </select>
          </label>
          {filterForm.watch('dimension') === 'property' && (
            <label>
              Property key
              <input required {...filterForm.register('key')} className="mt-1 block rounded border border-gray-200 p-2" />
            </label>
          )}
          <label>
            Value
            <input required {...filterForm.register('value')} className="mt-1 block rounded border border-gray-200 p-2" />
          </label>
          <button className="rounded bg-violet-600 px-4 py-2 text-white">Apply filter</button>
        </form>
      )}
      {(filters.length > 0 || goal) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <button
              key={`${filter.dimension}-${filter.key}`}
              type="button"
              className="flex items-center gap-2 rounded bg-violet-100 px-3 py-1 text-sm text-violet-800"
              onClick={() => onFiltersChange(filters.filter((_, i) => i !== index))}
            >
              {filter.dimension}: {filter.operator.replace('_', ' ')} {filter.value}
              <IClose />
            </button>
          ))}
          {goal && (
            <button type="button" onClick={() => onGoalChange('')} className="flex items-center gap-2 rounded bg-violet-100 px-3 py-1 text-sm text-violet-800">
              Goal selected
              <IClose />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onFiltersChange([]);
              onGoalChange('');
            }}
            className="text-gray-500 text-sm"
          >
            Clear all
          </button>
        </div>
      )}
    </>
  );
};
