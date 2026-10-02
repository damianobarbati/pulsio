import cx from 'clsx-tw';
import * as React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { GET, MDELETE, MPOST, MPUT, POST } from 'ui/api/fetchers.ts';
import { IClose, ICopy, IGlobe, IPlus, ITrash, IUptime } from 'ui/icons.tsx';

type Group = { id: string; label: string; public: boolean; slug: string };
type Monitor = { id: string; label: string; url: string; enabled: boolean; state: 'up' | 'down'; recipients: string[] };
type MonitorForm = { label: string; url: string; recipients: string; threshold_seconds: number; auth_mode: 'none' | 'headers'; headers: { name: string; value: string }[] };
type Usage = { used: number; limit: number };

const Uptime = () => {
  const groups = useSWR<Group[]>(['/uptime/group/list'], POST, { shouldRetryOnError: false });
  const usage = useSWR<Usage>(['/uptime/usage'], GET, { shouldRetryOnError: false });
  const [groupId, setGroupId] = React.useState('');
  const [isCreatingGroup, setIsCreatingGroup] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const groupInput = React.useRef<HTMLInputElement>(null);
  const selected = groups.data?.find((group) => group.id === groupId) ?? groups.data?.[0];
  const monitors = useSWR<Monitor[]>(selected ? [`/uptime/group/${selected.id}/monitor/list`] : null, POST, { shouldRetryOnError: false });
  const groupForm = useForm<{ label: string }>({ defaultValues: { label: '' } });
  const groupLabel = groupForm.register('label', { required: true });
  const monitorForm = useForm<MonitorForm>({ defaultValues: { label: '', url: '', recipients: '', threshold_seconds: 60, auth_mode: 'none', headers: [] } });
  const headers = useFieldArray({ control: monitorForm.control, name: 'headers' });
  const createGroup = useSWRMutation('/uptime/group', MPOST);
  const createMonitor = useSWRMutation('/uptime/monitor', MPOST);

  const show = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3000);
  };

  const create = async ({ label }: { label: string }) => {
    try {
      await createGroup.trigger({ label });
      groupForm.reset();
      setIsCreatingGroup(false);
      await groups.mutate();
      show('Group created.');
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not create group.');
    }
  };

  const addMonitor = async (values: MonitorForm) => {
    if (!selected) return;

    try {
      await createMonitor.trigger({
        ...values,
        groupId: selected.id,
        recipients: values.recipients
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        headers: values.auth_mode === 'headers' ? values.headers : [],
        enabled: true,
      });
      monitorForm.reset();
      await monitors.mutate();
      await usage.mutate();
      show('Monitor created.');
    } catch (error) {
      show(error instanceof Error ? error.message : 'Could not create monitor.');
    }
  };

  const togglePublic = async () => {
    if (!selected) return;
    await MPUT(`/uptime/group/${selected.id}/public`, { arg: { public: !selected.public } });
    await groups.mutate();
    show(selected.public ? 'Public status page disabled.' : 'Public status page enabled.');
  };

  const copy = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(`${window.location.origin}/status/${selected.slug}`);
    show('Public status URL copied.');
  };

  const toggle = async (monitor: Monitor) => {
    await MPUT(`/uptime/monitor/${monitor.id}/enabled`, { arg: { enabled: !monitor.enabled } });
    await monitors.mutate();
  };

  const removeMonitor = async (monitor: Monitor) => {
    if (!window.confirm(`Delete ${monitor.label}?`)) return;
    await MDELETE(`/uptime/monitor/${monitor.id}`, { arg: {} });
    await monitors.mutate();
    await usage.mutate();
    show('Monitor deleted.');
  };

  const removeGroup = async () => {
    if (!selected || !window.confirm(`Delete ${selected.label} and its monitors?`)) return;
    await MDELETE(`/uptime/group/${selected.id}`, { arg: {} });
    setGroupId('');
    await groups.mutate();
    await usage.mutate();
    show('Group deleted.');
  };

  if (groups.error) return <main role="alert">{groups.error.message}</main>;
  if (!groups.data) return <main>Loading uptime monitoring…</main>;

  const authMode = monitorForm.watch('auth_mode');
  const monitorLimitReached = !!usage.data && usage.data.used >= usage.data.limit;

  return (
    <div className="mx-auto max-w-330 pb-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h1 className="mt-3 flex flex-row items-center gap-2 font-bold text-3xl tracking-tight sm:text-4xl">
          <IUptime />
          Uptime monitoring
        </h1>

        <button
          className="anchor-btn"
          type="button"
          onClick={() => {
            setIsCreatingGroup(true);
            window.requestAnimationFrame(() => groupInput.current?.focus());
          }}
        >
          <IPlus /> New group
        </button>
      </header>
      <div className="grid gap-6 lg:grid-cols-[17.375rem_minmax(0,1fr)]">
        <aside>
          <section className="overflow-hidden rounded-lg border border-pulsio-line bg-white shadow-pulsio">
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <h2 className="font-semibold text-lg tracking-tight">Groups</h2>
              <span className="rounded-full bg-accent px-2 py-0.5 font-bold text-[12px] text-pulsio-blue">{groups.data.length}</span>
            </div>
            <div className="px-2.5 pb-2.5">
              {groups.data.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setGroupId(group.id)}
                  className={cx(
                    'mb-1 w-full rounded-md border border-transparent px-3 py-3 text-left',
                    group.id === selected?.id ? 'border-pulsio-blue bg-white shadow-pulsio' : 'hover:bg-slate-50',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{group.label}</span>
                    <span className={cx('h-2 w-2 rounded-full', group.public ? 'bg-green-500' : 'bg-amber-500')} />
                  </span>
                  <span className="mt-1 block text-[12px] text-pulsio-muted">{group.public ? 'Public' : 'Private'}</span>
                </button>
              ))}
              {isCreatingGroup && (
                <form className="mt-2 border-pulsio-line border-t pt-3" onSubmit={groupForm.handleSubmit(create)}>
                  <input
                    {...groupLabel}
                    ref={(element) => {
                      groupLabel.ref(element);
                      groupInput.current = element;
                    }}
                    className="w-full rounded border border-pulsio-line px-3 py-2 text-sm"
                    placeholder="New group"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="flex-1 rounded border border-pulsio-line px-3 py-2 font-semibold text-sm hover:border-blue-300"
                      type="button"
                      onClick={() => setIsCreatingGroup(false)}
                    >
                      Cancel
                    </button>
                    <button className="flex-1 rounded bg-pulsio-blue px-3 py-2 font-semibold text-sm text-white hover:bg-blue-700" type="submit">
                      Create
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
          {usage.data && (
            <p className="mt-4 text-pulsio-muted text-xs">
              {usage.data.used} / {usage.data.limit} monitors used
            </p>
          )}
        </aside>
        <section className="min-w-0">
          {selected ? (
            <>
              <section className="rounded-lg border border-pulsio-line bg-white px-6 py-5 shadow-pulsio">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-lg bg-accent font-extrabold text-pulsio-blue">{selected.label.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <h2 className="font-semibold text-lg tracking-tight">{selected.label}</h2>
                      <p className="mt-0.5 truncate text-[12px] text-pulsio-muted">
                        {window.location.origin}/status/{selected.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[13px] text-slate-600">Public status page</span>
                    <button
                      type="button"
                      onClick={togglePublic}
                      aria-pressed={selected.public}
                      aria-label="Toggle public status page"
                      className={cx(
                        'relative h-5.5 w-10 rounded-full transition-colors after:absolute after:top-0.75 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform',
                        selected.public ? 'bg-pulsio-blue after:right-0.75' : 'bg-slate-300 after:left-0.75',
                      )}
                    />
                    {selected.public && (
                      <>
                        <a
                          className="grid h-8 w-8 place-items-center rounded border border-pulsio-line text-slate-600 hover:border-blue-300 hover:text-pulsio-blue"
                          href={`/status/${selected.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open status page"
                        >
                          <IGlobe size={16} />
                        </a>
                        <button
                          className="grid h-8 w-8 place-items-center rounded border border-pulsio-line text-slate-600 hover:border-blue-300 hover:text-pulsio-blue"
                          type="button"
                          onClick={copy}
                          title="Copy status link"
                        >
                          <ICopy size={16} />
                        </button>
                      </>
                    )}
                    <button
                      className="grid h-8 w-8 place-items-center rounded border border-pulsio-line text-slate-600 hover:border-red-300 hover:text-red-700"
                      type="button"
                      onClick={removeGroup}
                      title="Delete group"
                    >
                      <ITrash size={16} />
                    </button>
                  </div>
                </div>
              </section>
              <section className="mt-5">
                <div className="overflow-hidden rounded-lg border border-pulsio-line bg-white shadow-pulsio">
                  {monitors.data?.map((monitor) => (
                    <article
                      className="grid grid-cols-[minmax(180px,1.3fr)_75px_75px_42px_38px] items-center gap-3 border-pulsio-line border-b px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(230px,1.3fr)_86px_88px_102px_78px_42px_38px]"
                      key={monitor.id}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cx(
                            'h-2.25 w-2.25 flex-none rounded-full shadow-[0_0_0_4px]',
                            monitor.enabled && monitor.state === 'up' ? 'bg-green-500 shadow-green-100' : 'bg-amber-500 shadow-amber-100',
                          )}
                        />
                        <div className="min-w-0">
                          <strong className="block truncate">{monitor.label}</strong>
                          <span className="block truncate text-[12px] text-pulsio-muted">{monitor.url}</span>
                        </div>
                      </div>
                      <div className="hidden lg:block">
                        <span className="block text-[11px] text-pulsio-muted">Response</span>
                        <span className="font-semibold text-[13px]">2xx</span>
                      </div>
                      <div>
                        <span className="block text-[11px] text-pulsio-muted">Uptime</span>
                        <span className={cx('font-semibold text-[13px]', monitor.enabled && monitor.state === 'up' ? 'text-green-700' : 'text-amber-700')}>
                          {monitor.enabled && monitor.state === 'up' ? '100%' : 'Paused'}
                        </span>
                      </div>
                      <div className="hidden lg:block">
                        <span className="block text-[11px] text-pulsio-muted">Recipients</span>
                        <span className="font-semibold text-[13px]">
                          {monitor.recipients.length} {monitor.recipients.length === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                      <div className="hidden lg:block">
                        <span className="block text-[11px] text-pulsio-muted">State</span>
                        <span className={cx('font-semibold text-[13px]', monitor.enabled && monitor.state === 'up' ? 'text-green-700' : 'text-amber-700')}>
                          {monitor.enabled ? (monitor.state === 'up' ? 'Up' : 'Down') : 'Paused'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(monitor)}
                        aria-pressed={monitor.enabled}
                        aria-label={`${monitor.enabled ? 'Disable' : 'Enable'} ${monitor.label}`}
                        className={cx(
                          'relative h-5.5 w-10 rounded-full transition-colors after:absolute after:top-0.75 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform',
                          monitor.enabled ? 'bg-pulsio-blue after:right-0.75' : 'bg-slate-300 after:left-0.75',
                        )}
                      />
                      <button
                        className="grid h-8 w-8 place-items-center rounded text-red-600 hover:bg-red-50 hover:text-red-700"
                        type="button"
                        onClick={() => removeMonitor(monitor)}
                        aria-label={`Delete ${monitor.label}`}
                      >
                        <ITrash size={19} />
                      </button>
                    </article>
                  ))}
                  {monitors.data?.length === 0 && <p className="px-5 py-8 text-center text-pulsio-muted text-sm">No monitors in this group yet.</p>}
                </div>
              </section>
              <section id="monitor-form" className="mt-5 rounded-lg border border-pulsio-line bg-white px-6 py-5 shadow-pulsio">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-lg tracking-tight">Add monitor</h2>
                    <p className="mt-1 text-[13px] text-pulsio-muted">We will check this URL every minute.</p>
                  </div>
                  <button className="text-pulsio-muted hover:text-pulsio-ink" type="button" onClick={() => monitorForm.reset()} aria-label="Clear add monitor form">
                    <IClose size={22} />
                  </button>
                </div>
                <form className="mt-5" onSubmit={monitorForm.handleSubmit(addMonitor)}>
                  <div className="grid gap-4 sm:grid-cols-[1fr_1.5fr]">
                    <label className="block font-semibold text-[12px] text-slate-700">
                      Monitor label
                      <input
                        className="mt-1.5 w-full rounded border border-pulsio-line px-3 py-2.5 font-normal text-sm"
                        placeholder="Checkout API"
                        {...monitorForm.register('label', { required: true })}
                      />
                    </label>
                    <label className="block font-semibold text-[12px] text-slate-700">
                      URL
                      <input
                        className="mt-1.5 w-full rounded border border-pulsio-line px-3 py-2.5 font-normal text-sm"
                        placeholder="https://api.example.com/health"
                        type="url"
                        {...monitorForm.register('url', { required: true })}
                      />
                    </label>
                  </div>
                  <label className="mt-4 block font-semibold text-[12px] text-slate-700">
                    Alert recipients
                    <input
                      className="mt-1.5 w-full rounded border border-pulsio-line px-3 py-2.5 font-normal text-sm"
                      placeholder="ops@example.com, team@example.com"
                      {...monitorForm.register('recipients', { required: true })}
                    />
                  </label>
                  <div className="mt-4 rounded-md border border-pulsio-line bg-[#f8fbff] p-4">
                    <span className="block font-semibold text-[12px] text-slate-700">Authentication</span>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                      <label className="flex items-center gap-2 font-medium text-slate-600 text-sm">
                        <input className="m-0 h-4 w-4 accent-pulsio-blue" type="radio" value="none" {...monitorForm.register('auth_mode')} />
                        None
                      </label>
                      <label className="flex items-center gap-2 font-medium text-slate-600 text-sm">
                        <input className="m-0 h-4 w-4 accent-pulsio-blue" type="radio" value="headers" {...monitorForm.register('auth_mode')} />
                        Custom headers
                      </label>
                    </div>
                    {authMode === 'headers' && (
                      <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]">
                        {headers.fields.map((field, index) => (
                          <React.Fragment key={field.id}>
                            <input
                              className="rounded border border-pulsio-line px-3 py-2 text-sm"
                              placeholder="Header name"
                              {...monitorForm.register(`headers.${index}.name` as const, { required: true })}
                            />
                            <input
                              className="rounded border border-pulsio-line px-3 py-2 text-sm"
                              placeholder="Header value"
                              {...monitorForm.register(`headers.${index}.value` as const, { required: true })}
                            />
                            <button className="rounded border border-pulsio-line px-2 text-pulsio-muted" type="button" onClick={() => headers.remove(index)}>
                              <IClose />
                            </button>
                          </React.Fragment>
                        ))}
                        {headers.fields.length < 3 && (
                          <button className="w-fit font-semibold text-pulsio-blue text-sm" type="button" onClick={() => headers.append({ name: '', value: '' })}>
                            Add header
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button className="rounded border border-pulsio-line px-3.5 py-2.5 font-semibold text-slate-700 text-sm" type="button" onClick={() => monitorForm.reset()}>
                      Cancel
                    </button>
                    <button className="anchor-btn" type="submit" disabled={monitorLimitReached || createMonitor.isMutating}>
                      <IPlus /> Create monitor
                    </button>
                  </div>
                  {monitorLimitReached && <p className="mt-3 text-pulsio-muted text-sm">Your plan monitor limit has been reached.</p>}
                </form>
              </section>
            </>
          ) : (
            <p className="rounded-lg border border-pulsio-line border-dashed px-5 py-10 text-center text-pulsio-muted">Create a group to add monitors.</p>
          )}
        </section>
      </div>
      {message && (
        <p className="fixed right-7 bottom-6 rounded-md bg-slate-900 px-3.5 py-2.5 text-white shadow-pulsio" role="status">
          {message}
        </p>
      )}
    </div>
  );
};

export default Uptime;
