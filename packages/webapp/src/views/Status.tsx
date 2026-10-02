import cx from 'clsx-tw';
import dayjs from 'dayjs';
import * as React from 'react';
import useSWR from 'swr';
import { GET } from 'ui/api/fetchers.ts';
import { ICheck, IClose } from 'ui/icons.tsx';

type StatusProps = { slug: string };
type Status = { label: string; state: string; monitors: { label: string; state: string; uptime: number; daily: { date: string; state: 'up' | 'down' | 'neutral' }[] }[] };

const Status = ({ slug }: StatusProps) => {
  const [range, setRange] = React.useState(90);
  const status = useSWR<Status>([`/status/${slug}?range=${range}`], GET);
  if (!status.data) return <main className="mx-auto w-[min(960px,calc(100%-40px))] py-12">Loading status…</main>;
  const operational = status.data.state === 'operational';
  const monitored = status.data.monitors.filter((monitor) => monitor.state === 'up').length;
  const averageUptime = status.data.monitors.length ? status.data.monitors.reduce((total, monitor) => total + monitor.uptime, 0) / status.data.monitors.length : 0;
  const startDate = dayjs()
    .subtract(range - 1, 'day')
    .format(range === 90 ? 'MMM D' : 'MMM D, YYYY');
  return (
    <div className="min-h-screen bg-pulsio-surface">
      <header className="flex h-max items-center border-pulsio-line border-b bg-white px-7 py-2 text-center">
        <a
          className="mx-auto inline-flex w-240 items-center gap-3 text-left font-extrabold text-[38px] text-pulsio-blue tracking-[-2.25px] max-sm:gap-2.5 max-sm:text-3xl"
          href={window.config.WEBSITE_URL}
          aria-label="Pulsio status page"
        >
          <img className="h-11 w-11 max-sm:h-8.5 max-sm:w-8.5" src="/logo.svg" alt="" />
          Pulsio
        </a>
      </header>
      <main id="top" className="mx-auto my-12.5 w-240 max-sm:my-9">
        <section className="text-center">
          <div className={cx('mx-auto mb-4 grid h-13.5 w-13.5 place-items-center rounded-full text-2xl', operational ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}>
            {operational ? <ICheck /> : <IClose />}
          </div>
          <h1 className="font-bold text-[34px] tracking-tight">
            {status.data.label} is {operational ? 'operational' : 'degraded'}
          </h1>
          <p
            className={cx(
              'mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-bold text-[13px]',
              operational ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            )}
          >
            <span className={cx('h-2 w-2 rounded-full', operational ? 'bg-green-600' : 'bg-red-600')} />
            {operational ? 'All systems are operating normally' : 'One or more systems are degraded'}
          </p>
        </section>
        <section className="mt-9 grid grid-cols-3 gap-3.5 max-sm:grid-cols-1" aria-label="Uptime summary">
          <div className="rounded-lg border border-pulsio-line bg-white px-5 py-4 text-center shadow-[0_6px_18px_rgb(11_11_11_/_4%)]">
            <strong className="block text-[22px] tracking-tight">{monitored}</strong>
            <span className="mt-0.5 block text-[12px] text-pulsio-muted">Monitors operational</span>
          </div>
          <div className="rounded-lg border border-pulsio-line bg-white px-5 py-4 text-center shadow-[0_6px_18px_rgb(11_11_11_/_4%)]">
            <strong className="block text-[22px] tracking-tight">{averageUptime.toFixed(2)}%</strong>
            <span className="mt-0.5 block text-[12px] text-pulsio-muted">Average uptime · {range} days</span>
          </div>
          <div className="rounded-lg border border-pulsio-line bg-white px-5 py-4 text-center shadow-[0_6px_18px_rgb(11_11_11_/_4%)]">
            <strong className="block text-[22px] tracking-tight">1 min</strong>
            <span className="mt-0.5 block text-[12px] text-pulsio-muted">Check interval</span>
          </div>
        </section>
        <section>
          <div className="mt-10 flex items-end justify-between gap-5 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 className="font-semibold text-lg tracking-tight">Service availability</h2>
              <p className="mt-0.5 text-[13px] text-pulsio-muted">Daily availability for the selected period.</p>
            </div>
            <div className="flex rounded-md bg-[#eaf1fc] p-0.75" aria-label="Availability period">
              <button
                type="button"
                onClick={() => setRange(90)}
                className={cx(
                  'rounded px-3 py-1.5 font-semibold text-[12px]',
                  range === 90 ? 'bg-white text-pulsio-blue shadow-[0_1px_4px_rgb(11_11_11_/_10%)]' : 'text-slate-600',
                )}
              >
                Last 90 days
              </button>
              <button
                type="button"
                onClick={() => setRange(365)}
                className={cx(
                  'rounded px-3 py-1.5 font-semibold text-[12px]',
                  range === 365 ? 'bg-white text-pulsio-blue shadow-[0_1px_4px_rgb(11_11_11_/_10%)]' : 'text-slate-600',
                )}
              >
                Last 12 months
              </button>
            </div>
          </div>
          <div className="mt-3.5 overflow-hidden rounded-lg border border-pulsio-line bg-white shadow-pulsio">
            {status.data.monitors.map((monitor) => (
              <article className="border-pulsio-line border-b px-5 pt-4.5 pb-4 last:border-b-0" key={monitor.label}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 max-sm:grid-cols-[1fr_auto]">
                  <div className="flex min-w-0 items-center gap-2.5 font-bold">
                    <span
                      className={cx(
                        'h-2.25 w-2.25 flex-none rounded-full shadow-[0_0_0_4px]',
                        monitor.state === 'up' ? 'bg-green-500 shadow-green-100' : 'bg-red-500 shadow-red-100',
                      )}
                    />
                    {monitor.label}
                  </div>
                  <span className={cx('font-bold text-[12px]', monitor.state === 'up' ? 'text-green-700' : 'text-red-700')}>{monitor.state === 'up' ? 'Operational' : 'Down'}</span>
                  <span className="font-semibold text-[12px] text-slate-700 max-sm:col-start-1">{monitor.uptime.toFixed(2)}% uptime</span>
                </div>
                <div
                  className={cx(
                    'mt-3 grid gap-0.75',
                    range === 90 ? 'grid-cols-[repeat(90,minmax(3px,1fr))] max-sm:grid-cols-[repeat(45,minmax(3px,1fr))]' : 'grid-cols-[repeat(365,minmax(1px,1fr))]',
                  )}
                >
                  {monitor.daily.map((day) => (
                    <span className="group relative block" key={day.date}>
                      <i
                        aria-label={dayjs(day.date).format('MMM D, YYYY')}
                        className={cx('block h-5.5 rounded-[2px]', day.state === 'up' ? 'bg-green-200' : day.state === 'down' ? 'bg-red-200' : 'bg-slate-200')}
                      />
                      <span
                        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                        role="tooltip"
                      >
                        {dayjs(day.date).format('MMM D, YYYY')}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>{startDate}</span>
                  <span>Today</span>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-3 flex justify-end gap-4 text-[11px] text-pulsio-muted max-sm:flex-wrap">
            <span className="flex items-center gap-1.5">
              <i className="h-2.25 w-2.25 rounded-[2px] bg-green-200" />
              All checks healthy
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.25 w-2.25 rounded-[2px] bg-red-200" />
              One or more failures
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2.25 w-2.25 rounded-[2px] bg-slate-200" />
              No data
            </span>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Status;
