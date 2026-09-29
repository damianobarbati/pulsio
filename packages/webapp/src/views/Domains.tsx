import cx from 'clsx-tw';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { IDomain } from 'types/Domain.ts';
import { DOWNLOAD, MDELETE, MPOST, MPUT, POST } from 'ui/api/fetchers.ts';
import { Button } from 'ui/component/Button.tsx';
import { Dialog } from 'ui/component/Dialog.tsx';
import { Toast } from 'ui/component/Toast.tsx';
import { Checkbox, Input, Select } from 'ui/form';
import { ICalendar, IChart, IClose, IDownload, IGlobe, ILink, IPlus, IReport, ITrash, IUsers } from 'ui/icons.tsx';

type Domain = IDomain.listResponse[number];
type ShareLink = Domain['shares'][number];
type SettingsFormValues = { currency: string };
type ShareFormValues = { linkLabel: string };
type ReportFormValues = { reportEnabled: boolean; reportFrequency: Domain['report_frequency']; recipient: string };

type ConfirmAction = 'reset' | 'delete' | { type: 'revoke'; linkId: string } | null;

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

const getInitials = (domain: string) => domain.slice(0, 2).toUpperCase();

const getStatus = (domain: Domain) => (domain.events_count > 0 ? 'Active' : 'Waiting for data');

const formatLastEvent = (value: string | null) =>
  value ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((Date.parse(value) - Date.now()) / 60_000), 'minute') : 'No events yet';

const formatCreatedAt = (value: string) => `Created ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(Date.parse(value))}`;

const getShareUrl = (link: ShareLink) => link.url;

const getConfirmCopy = (action: ConfirmAction, domain: Domain) => {
  if (action === 'reset') {
    return {
      title: `Reset data for ${domain.domain}?`,
      body: 'All tracked events and analytics history for this site will be permanently deleted.',
      confirmLabel: 'Reset data',
    };
  }

  if (action === 'delete') {
    return {
      title: `Delete ${domain.domain}?`,
      body: 'This removes the site, all tracked data, reports, and share links. This action cannot be undone.',
      confirmLabel: 'Delete site',
    };
  }

  return {
    title: 'Revoke share link?',
    body: 'Anyone using this link will lose access to the shared report immediately.',
    confirmLabel: 'Revoke link',
  };
};

export const Domains = ({ className }: { className?: string }) => {
  const domainsSWR = useSWR<IDomain.listResponse>(['/domain/list'], POST, { suspense: true, shouldRetryOnError: false });
  const domains = domainsSWR.data ?? [];
  const [selectedId, setSelectedId] = React.useState('');
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);
  const [toast, setToast] = React.useState('');
  const settingsForm = useForm<SettingsFormValues>();
  const shareForm = useForm<ShareFormValues>({ defaultValues: { linkLabel: '' } });
  const reportForm = useForm<ReportFormValues>();

  React.useEffect(() => {
    if (!selectedId && domains[0]) setSelectedId(domains[0].id);
    if (selectedId && !domains.some((domain) => domain.id === selectedId)) setSelectedId(domains[0]?.id ?? '');
  }, [domains, selectedId]);

  const selectedDomain = domains.find((domain) => domain.id === selectedId);

  React.useEffect(() => {
    if (!selectedDomain) return;
    settingsForm.reset({ currency: selectedDomain.currency });
    reportForm.reset({ reportEnabled: selectedDomain.report_enabled, reportFrequency: selectedDomain.report_frequency, recipient: '' });
  }, [selectedDomain, settingsForm, reportForm]);
  const update = useSWRMutation(selectedDomain ? `/domain/${selectedDomain.id}` : null, MPUT);
  const createShare = useSWRMutation(selectedDomain ? `/domain/${selectedDomain.id}/share` : null, MPOST);
  const reset = useSWRMutation(selectedDomain ? `/domain/${selectedDomain.id}/reset` : null, MPOST);
  const remove = useSWRMutation(selectedDomain ? `/domain/${selectedDomain.id}` : null, MDELETE);
  const sendReport = useSWRMutation(selectedDomain ? `/domain/${selectedDomain.id}/report/send` : null, MPOST);
  const exportEvents = useSWRMutation(selectedDomain ? `/domain/${selectedDomain.id}/export` : null, (path: string) => DOWNLOAD(path));
  const revoke = useSWRMutation(
    selectedDomain && confirmAction && typeof confirmAction === 'object' ? `/domain/${selectedDomain.id}/share/${confirmAction.linkId}` : null,
    MDELETE,
  );

  const updateSelected = async (input: Partial<Domain>) => {
    if (!selectedDomain) return;
    try {
      await update.trigger(input);
      await domainsSWR.mutate();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update domain.');
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 3000);
  };

  const createShareLink = async ({ linkLabel }: ShareFormValues) => {
    if (!selectedDomain) return;

    const label = linkLabel.trim() || 'Shared report';
    try {
      await createShare.trigger({ label });
      await domainsSWR.mutate();
      shareForm.reset();
      showToast('Share link created.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create share link.');
    }
  };

  const copyShareLink = async (link: ShareLink) => {
    try {
      const url = getShareUrl(link);
      await navigator.clipboard.writeText(url);
      showToast('Share link copied.');
    } catch {
      showToast(getShareUrl(link));
    }
  };

  const addRecipient = async ({ recipient }: ReportFormValues) => {
    const email = recipient.trim();
    if (!email || !selectedDomain) return;
    if (!email.includes('@') || selectedDomain.report_recipients.includes(email)) return;

    await updateSelected({ report_recipients: [...selectedDomain.report_recipients, email] });
    reportForm.setValue('recipient', '');
  };

  const downloadEvents = async () => {
    if (!selectedDomain) return;

    try {
      const blob = await exportEvents.trigger();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedDomain.domain}-events.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Events exported.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not export events.');
    }
  };

  const handleConfirm = async () => {
    if (!selectedDomain || !confirmAction) return;

    if (confirmAction === 'delete') {
      await remove.trigger();
      await domainsSWR.mutate();
      showToast(`${selectedDomain.domain} deleted.`);
    }

    if (confirmAction === 'reset') {
      await reset.trigger();
      await domainsSWR.mutate();
      showToast('Site data reset.');
    }

    if (typeof confirmAction === 'object') {
      await revoke.trigger();
      await domainsSWR.mutate();
      showToast('Share link revoked.');
    }

    setConfirmAction(null);
  };

  if (!selectedDomain) {
    return (
      <main className={cx('mx-auto max-w-6xl', className)}>
        <div className="rounded-lg border border-pulsio-line bg-white p-10 text-center shadow-pulsio">
          <IGlobe className="mx-auto text-pulsio-blue" size={36} />
          <h1 className="mt-4 font-semibold text-xl">No tracked sites</h1>
          <p className="mt-2 text-pulsio-muted text-sm">Add a site to start tracking events.</p>
        </div>
        <Toast message={toast} onClose={() => setToast('')} />
      </main>
    );
  }

  const confirmCopy = getConfirmCopy(confirmAction, selectedDomain);

  return (
    <main className={cx('mx-auto max-w-6xl', className)}>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <h1 className="mt-3 flex flex-row items-center gap-2 font-bold text-3xl tracking-tight sm:text-4xl">
          <IGlobe />
          Your domains
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-semibold text-sm">Tracked sites</h2>
            <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-pulsio-blue text-xs">{domains.length}</span>
          </div>
          <div className="space-y-2">
            {domains.map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => setSelectedId(domain.id)}
                className={cx(
                  'w-full rounded-lg border p-4 text-left transition hover:border-blue-300 hover:bg-white',
                  domain.id === selectedId ? 'border-pulsio-blue bg-white shadow-pulsio' : 'border-transparent bg-blue-50/60',
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-100 font-bold text-pulsio-blue text-xs">{getInitials(domain.domain)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-sm">{domain.domain}</span>
                      <span className="mt-1 block text-pulsio-muted text-xs">{formatNumber(domain.events_count)} events</span>
                    </span>
                  </span>
                  <span className={cx('mt-1 size-2 shrink-0 rounded-full', getStatus(domain) === 'Active' ? 'bg-emerald-500' : 'bg-amber-400')} />
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-lg bg-blue-100 font-bold text-pulsio-blue">{getInitials(selectedDomain.domain)}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-xl">{selectedDomain.domain}</h2>
                    <span
                      className={cx(
                        'rounded-full px-2 py-1 font-semibold text-xs',
                        getStatus(selectedDomain) === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                      )}
                    >
                      {getStatus(selectedDomain)}
                    </span>
                  </div>
                  <p className="mt-1 text-pulsio-muted text-sm">Last signal {formatLastEvent(selectedDomain.last_event_at)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6 text-right">
                <div>
                  <p className="text-pulsio-muted text-xs">Tracked events</p>
                  <p className="mt-1 font-semibold text-lg">{formatNumber(selectedDomain.events_count)}</p>
                </div>
                <div>
                  <p className="text-pulsio-muted text-xs">Reports</p>
                  <p className="mt-1 font-semibold text-lg">{selectedDomain.report_recipients.length}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end border-pulsio-line border-t pt-5">
              <Button type="button" variant="secondary" disabled={exportEvents.isMutating} onClick={downloadEvents}>
                <IDownload size={18} /> {exportEvents.isMutating ? 'Exporting…' : 'Export CSV'}
              </Button>
            </div>
          </section>

          <FormProvider {...settingsForm}>
            <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-blue-50 text-pulsio-blue">
                  <IChart size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">Site preferences</h2>
                  <p className="mt-1 text-pulsio-muted text-sm">Set how revenue and monetary values are displayed.</p>
                </div>
              </div>
              <Select className="mt-5 max-w-xs" label="Currency" name="currency" onChange={(event) => updateSelected({ currency: event.target.value })}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound Sterling</option>
                <option value="JPY">JPY — Japanese Yen</option>
              </Select>
            </section>
          </FormProvider>

          <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-violet-50 text-violet-600">
                  <ILink size={19} />
                </span>
                <div>
                  <h2 className="font-semibold">Share access</h2>
                  <p className="mt-1 text-pulsio-muted text-sm">Create read-only links for teammates and clients.</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-pulsio-muted text-xs">{selectedDomain.shares.length} active</span>
            </div>
            <FormProvider {...shareForm}>
              <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={shareForm.handleSubmit(createShareLink)}>
                <Input name="linkLabel" className="flex-1" placeholder="Link name, e.g. Board report" aria-label="Link name" />
                <Button type="submit" className="shrink-0">
                  <IPlus size={18} /> Create share link
                </Button>
              </form>
            </FormProvider>
            {selectedDomain.shares.length > 0 && (
              <div className="mt-5 divide-y divide-pulsio-line rounded-md border border-pulsio-line">
                {selectedDomain.shares.map((link) => (
                  <div key={link.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ILink className="shrink-0 text-pulsio-muted" size={17} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-sm">{link.label}</p>
                        <p className="mt-0.5 truncate text-pulsio-muted text-xs">{getShareUrl(link)}</p>
                        <p className="mt-0.5 text-pulsio-muted text-xs">{formatCreatedAt(link.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" className="font-semibold text-pulsio-blue text-xs hover:underline" onClick={() => copyShareLink(link)}>
                        Copy link
                      </button>
                      <button type="button" className="font-semibold text-red-600 text-xs hover:underline" onClick={() => setConfirmAction({ type: 'revoke', linkId: link.id })}>
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <FormProvider {...reportForm}>
            <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-orange-50 text-orange-600">
                    <IReport size={19} />
                  </span>
                  <div>
                    <h2 className="font-semibold">Automated reports</h2>
                    <p className="mt-1 text-pulsio-muted text-sm">Send a performance summary to your team automatically.</p>
                  </div>
                </div>
                <Checkbox
                  className="text-sm"
                  name="reportEnabled"
                  label="Enable reports"
                  checked={selectedDomain.report_enabled}
                  onChange={(event) => updateSelected({ report_enabled: event.target.checked })}
                />
              </div>
              {selectedDomain.report_enabled && (
                <div className="mt-5 rounded-md bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Select
                      className="min-w-36"
                      label="Frequency"
                      name="reportFrequency"
                      onChange={(event) => updateSelected({ report_frequency: event.target.value as Domain['report_frequency'] })}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                    <p className="flex items-center gap-2 text-pulsio-muted text-xs">
                      <ICalendar size={16} /> Next report Monday morning
                    </p>
                  </div>
                  <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={reportForm.handleSubmit(addRecipient)}>
                    <Input name="recipient" type="email" className="flex-1 bg-white" placeholder="name@company.com" aria-label="Recipient email" />
                    <Button type="submit" variant="secondary" className="shrink-0">
                      <IPlus size={18} /> Add recipient
                    </Button>
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedDomain.report_recipients.map((email) => (
                      <span key={email} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-pulsio-line">
                        <IUsers className="text-pulsio-muted" size={14} /> {email}
                        <button
                          type="button"
                          aria-label={`Remove ${email}`}
                          className="text-pulsio-muted hover:text-red-600"
                          onClick={() => updateSelected({ report_recipients: selectedDomain.report_recipients.filter((item) => item !== email) })}
                        >
                          <IClose size={14} />
                        </button>
                      </span>
                    ))}
                    {selectedDomain.report_recipients.length === 0 && <p className="text-pulsio-muted text-xs">Add at least one recipient to start sending reports.</p>}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={sendReport.isMutating || selectedDomain.report_recipients.length === 0}
                      onClick={async () => {
                        try {
                          await sendReport.trigger();
                          await domainsSWR.mutate();
                          showToast('Report sent.');
                        } catch (error) {
                          showToast(error instanceof Error ? error.message : 'Could not send report.');
                        }
                      }}
                    >
                      <IReport size={16} /> {sendReport.isMutating ? 'Sending…' : 'Send now'}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </FormProvider>

          <section className="rounded-lg border border-red-200 bg-red-50/50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-red-100 text-red-700">
                <ITrash size={19} />
              </span>
              <div>
                <h2 className="font-semibold text-red-900">Danger zone</h2>
                <p className="mt-1 text-red-800/70 text-sm">These actions permanently change data for this site.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-red-200 bg-white p-4">
                <h3 className="font-semibold text-sm">Reset tracked data</h3>
                <p className="mt-1 text-pulsio-muted text-xs">Delete all events while keeping site settings and tracking code.</p>
                <Button className="mt-4" variant="secondary" size="sm" onClick={() => setConfirmAction('reset')}>
                  Reset data
                </Button>
              </div>
              <div className="rounded-md border border-red-200 bg-white p-4">
                <h3 className="font-semibold text-sm">Delete site</h3>
                <p className="mt-1 text-pulsio-muted text-xs">Remove site, events, reports, and share links permanently.</p>
                <Button className="mt-4" variant="danger" size="sm" onClick={() => setConfirmAction('delete')}>
                  Delete {selectedDomain.domain}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Dialog open={confirmAction !== null} title={confirmCopy.title} confirmLabel={confirmCopy.confirmLabel} onConfirm={handleConfirm} onClose={() => setConfirmAction(null)}>
        <p>{confirmCopy.body}</p>
      </Dialog>
      <Toast message={toast} onClose={() => setToast('')} />
    </main>
  );
};

export default Domains;
