import cx from 'clsx-tw';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { IBolt, IChart, IGlobe, ILock } from 'ui/icons.tsx';
import { createPageMetadata, getWebsiteConfig } from '../seo';

const sections = [
  { id: 'compare', label: 'The difference' },
  { id: 'simple', label: 'Simple' },
  { id: 'lightweight', label: 'Lightweight' },
  { id: 'privacy', label: 'Privacy-first' },
  { id: 'complete', label: 'Reports' },
  { id: 'eu-hosted', label: 'European hosting' },
];

const comparisonRows = [
  { label: 'Tracking client', pulsio: 'Async browser client', plausible: 'Async browser client', google: 'Full analytics tag' },
  { label: 'Tracking cookies', pulsio: 'None', plausible: 'None', google: 'Used by default' },
  { label: 'Cookie banner for analytics', pulsio: 'Not needed', plausible: 'Not needed', google: 'Often required' },
  { label: 'Persistent visitor profiles', pulsio: 'None', plausible: 'None', google: 'Supported' },
  { label: 'Privacy model', pulsio: 'Cookieless analytics', plausible: 'Privacy-focused analytics', google: 'Full-suite analytics' },
  { label: 'European hosting', pulsio: 'Yes', plausible: 'Yes', google: 'Depends on configuration' },
];

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({
    title: 'Why Pulsio',
    description: 'Fast, privacy-first website analytics with the data you need and none of the noise.',
    path: '/why-pulsio',
    siteUrl: new URL(config.WEBSITE_URL),
  });
};

const benefits = [
  {
    id: 'simple',
    label: 'Simple analytics',
    title: 'Know what matters in seconds.',
    text: 'Review visitors, page views, sources, campaigns, content, countries, devices, browsers, events, conversions, and revenue in one dashboard. Filter dimensions, compare periods, and inspect related reports without building a custom setup.',
    Icon: IChart,
  },
  {
    id: 'lightweight',
    label: 'Lightweight by design',
    title: 'Keep tracking overhead small.',
    text: 'The Pulsio client loads asynchronously and is about 1.9 KB gzipped in the current build. It records page views, engagement, interaction, scroll depth, and custom events without requiring a tag manager.',
    Icon: IBolt,
  },
  {
    id: 'privacy',
    label: 'Privacy-first',
    title: 'Measure activity without a cookie banner.',
    text: 'Pulsio tracking uses no tracking cookies and does not build persistent visitor profiles or follow visitors across websites and devices. The service is designed to work without a cookie banner. Do not send personal data in custom event properties.',
    Icon: ILock,
  },
  {
    id: 'complete',
    label: 'Everything you need',
    title: 'Simple does not mean limited.',
    text: 'Use live traffic, acquisition reports, content reports, technology and location breakdowns, custom events, conversion metrics, revenue tracking, ecommerce items, filters, CSV export, shared dashboards, and scheduled email reports.',
    Icon: IChart,
  },
  {
    id: 'eu-hosted',
    label: 'European hosting',
    title: 'Your analytics data stays in Europe.',
    text: 'Pulsio hosts analytics data on European infrastructure and keeps visitor data within Europe. This gives teams a clear European data residency position.',
    Icon: IGlobe,
  },
];

export default async function WhyPulsio({ className }: { className?: string }) {
  await connection();
  const config = getWebsiteConfig();

  return (
    <div className={cx('contents', className)}>
      <section className="bg-pulsio-nav">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
          <div>
            <p className="font-bold text-pulsio-blue text-xs uppercase tracking-[0.2em]">Why Pulsio</p>
            <h1 className="mt-5 max-w-3xl font-bold text-5xl leading-[.98] tracking-tighter sm:text-7xl">Analytics that respect your website and your visitors.</h1>
            <p className="mt-7 max-w-2xl text-ink/75 text-xl leading-relaxed">
              Get the insight you need to grow, without the noise, weight, or surveillance that comes with traditional analytics.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/start-tracking" className="rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
                Start tracking free
              </Link>
              <a href={`${config.WEBAPP_URL}/share/pulsio`} className="rounded-sm border border-pulsio-line bg-white px-7 py-4 font-bold">
                See live demo
              </a>
            </div>
          </div>
          <div className="rounded-sm bg-pulsio-ink p-7 text-white sm:p-10">
            <p className="font-bold text-lime-300 text-xs uppercase tracking-[0.2em]">Small script. Clear signal.</p>
            <p className="mt-6 font-bold text-7xl tracking-tighter">1.9 KB</p>
            <p className="mt-2 text-lg text-white/70">gzipped tracking script</p>
            <div className="mt-8 border-white/15 border-t pt-6 text-sm text-white/75 leading-relaxed">
              Lightweight enough for every page. Powerful enough for product, marketing, and agency teams.
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1400px] gap-10 px-6 py-12 lg:grid-cols-[12rem_minmax(0,52rem)] lg:justify-center lg:gap-20 lg:py-20">
        <aside>
          <nav aria-label="Why Pulsio sections" className="lg:sticky lg:top-8">
            <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">On this page</p>
            <ol className="mt-4 flex gap-2 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-1 lg:overflow-visible">
              {sections.map((section) => (
                <li key={section.id} className="shrink-0">
                  <a href={`#${section.id}`} className="block rounded-sm px-3 py-2 text-ink/70 hover:bg-blue-100 hover:text-ink">
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0">
          <div className="max-w-3xl">
            <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Built for useful insight</p>
            <h2 className="mt-4 font-bold text-4xl tracking-tighter sm:text-5xl">Everything you need. Nothing that gets in the way.</h2>
          </div>
          <section id="compare" className="scroll-mt-8 py-12 sm:py-16">
            <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">The difference</p>
            <h2 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">The insight you need, without the weight you do not.</h2>
            <p className="mt-4 max-w-3xl text-ink/75 text-lg leading-relaxed">
              Pulsio focuses on a small client, clear website reports, and privacy-friendly measurement. The table below gives a high-level product comparison; external figures can
              change over time.
            </p>
            <div className="mt-8 overflow-x-auto rounded-sm border border-pulsio-line">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-pulsio-ink text-white">
                  <tr>
                    <th className="px-4 py-4 font-medium">At a glance</th>
                    <th className="bg-pulsio-blue px-4 py-4 font-bold">Pulsio</th>
                    <th className="px-4 py-4 font-bold">Plausible</th>
                    <th className="px-4 py-4 font-bold">Google Analytics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pulsio-line">
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <th className="px-4 py-4 font-bold">{row.label}</th>
                      <td className="bg-blue-50 px-4 py-4 font-medium">{row.pulsio}</td>
                      <td className="px-4 py-4 text-ink/75">{row.plausible}</td>
                      <td className="px-4 py-4 text-ink/75">{row.google}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="mt-10 divide-y divide-ink/15">
            {benefits.map(({ id, label, title, text, Icon }) => (
              <section key={id} id={id} className="scroll-mt-8 py-10 first:pt-0 last:pb-0 sm:py-14">
                <div className="flex gap-5 sm:gap-7">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-sm bg-blue-100 text-pulsio-blue">
                    <Icon size={26} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">{label}</p>
                    <h3 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">{title}</h3>
                    <p className="mt-4 max-w-2xl text-ink/75 text-lg leading-relaxed">{text}</p>
                  </div>
                </div>
              </section>
            ))}
          </div>

          <section className="mt-16 rounded-sm bg-pulsio-ink px-6 py-10 text-white sm:px-10 sm:py-12">
            <h2 className="max-w-xl font-bold text-3xl tracking-tight sm:text-4xl">Make decisions from the reports you actually use.</h2>
            <p className="mt-4 max-w-xl text-lg text-white/80 leading-relaxed">
              Start with website analytics that covers traffic, events, conversions, revenue, and sharing in one workspace.
            </p>
            <Link href="/start-tracking" className="mt-7 inline-block rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
              Start tracking free
            </Link>
          </section>
        </article>
      </div>
    </div>
  );
}
