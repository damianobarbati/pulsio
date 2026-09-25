import cx from 'clsx-tw';
import type { Metadata } from 'next';
import Link from 'next/link';
import { AgencyCalculator } from '../../components/AgencyCalculator';
import { createPageMetadata, getWebsiteConfig } from '../seo';

export const generateMetadata = (): Metadata =>
  createPageMetadata({
    title: 'Analytics for agencies',
    description: 'Manage client websites, branded analytics dashboards, and automated reports in Pulsio.',
    path: '/for-agency',
    siteUrl: new URL(getWebsiteConfig().WEBSITE_URL),
  });

export default function ForAgency({ className }: { className?: string }) {
  return (
    <div className={cx('contents', className)}>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
        <div>
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Pulsio for agencies</p>
          <h1 className="mt-4 font-bold text-5xl leading-[1.02] tracking-tighter sm:text-6xl">Turn client analytics into a service.</h1>
          <p className="mt-7 max-w-2xl text-ink/75 text-lg leading-relaxed">
            Track every client site in one place, launch campaigns, and measure revenue precisely. Give clients branded dashboards and automatic reports without extra tools.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/start-tracking" className="rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
              Start tracking free
            </Link>
            <a href="#calculator" className="rounded-sm border border-pulsio-line px-7 py-4 font-bold">
              Calculate revenue
            </a>
          </div>
        </div>
        <div className="grid gap-4 rounded-3xl bg-pulsio-nav p-6 sm:grid-cols-2">
          {[
            ['All clients, one workspace', 'Switch between every client website and campaign without changing tools.'],
            ['Branded shared dashboards', 'Create revocable, password-free links that use your agency name and logo.'],
            ['Automatic reports', 'Send weekly or monthly summaries with essential metrics, top pages, and sources.'],
            ['Revenue you can prove', 'Track conversions and revenue accurately, then show the results to clients.'],
          ].map(([title, text]) => (
            <article key={title} className="rounded-2xl bg-white p-5">
              <h2 className="font-bold">{title}</h2>
              <p className="mt-2 text-pulsio-muted text-sm leading-relaxed">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div id="calculator" className="scroll-mt-8">
          <AgencyCalculator />
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Centralized client growth</p>
        <h2 className="mt-3 font-bold text-3xl tracking-tight">Analytics, sharing, reporting, and revenue in one workflow.</h2>
      </section>
    </div>
  );
}
