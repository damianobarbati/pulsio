import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata, siteUrl } from './seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Premium analytics, made simple',
  description: 'Privacy-first website analytics for developers. See visitors, pageviews, top pages, and traffic sources without the noise.',
  path: '/',
});

const plans = [
  { name: 'Start', monthly: '$4', yearly: '$39', pageviews: '50k', sites: '3', featured: true },
  { name: 'Grow', monthly: '$10', yearly: '$96', pageviews: '250k', sites: '10', featured: false },
  { name: 'Scale', monthly: '$30', yearly: '$288', pageviews: '1M', sites: 'Unlimited', featured: false },
  { name: 'Expand', monthly: 'Contact us', yearly: 'Contact us', pageviews: '1M+', sites: 'Custom', featured: false },
];

export default function Home() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Pulsio',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Privacy-first website analytics for developers.',
    url: siteUrl.toString(),
    offers: plans.slice(0, 3).map((plan) => ({
      '@type': 'Offer',
      price: plan.monthly.replace('$', ''),
      priceCurrency: 'USD',
      description: `${plan.name} plan with ${plan.pageviews} monthly pageviews.`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <h1 className="font-semibold text-6xl leading-[1.02] tracking-tighter sm:text-7xl">
            <b>Pulsio.</b>
            <br />
            Premium analytics,
            <br />
            made simple.
          </h1>
          <p className="mt-7 max-w-md text-ink/75 text-lg leading-relaxed">Privacy-first. Developer-friendly. Fairly priced.</p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link href="/start-tracking" className="rounded-full bg-ink px-7 py-4 font-semibold text-white">
              Start tracking ↗
            </Link>
            <span className="text-sm">
              From $4 per month.
              <br />
              Every feature included.
            </span>
          </div>
        </div>
        <div className="relative rounded-3xl bg-accent p-5 sm:p-9">
          <div className="rounded-2xl bg-white p-6 shadow-ink/10 shadow-lg">
            <div className="flex items-center justify-between border-ink/10 border-b pb-5">
              <span className="font-bold">your-site.com</span>
              <span className="rounded-full bg-paper px-3 py-1 text-xs">Last 24 hours</span>
            </div>
            <div className="my-7 grid grid-cols-3 gap-3">
              {[
                ['Visitors', '1,204'],
                ['Pageviews', '3,628'],
                ['Live now', '8'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-ink/60 text-xs">{label}</p>
                  <p className="mt-2 font-semibold text-2xl sm:text-3xl">{value}</p>
                </div>
              ))}
            </div>
            <svg viewBox="0 0 400 130" role="img" aria-label="Illustrative visitor trend" className="w-full">
              <path d="M0 110H400M0 65H400M0 20H400" stroke="#edf0e8" />
              <path
                d="M0 108L25 97L50 101L75 67L100 81L125 48L150 62L175 45L200 55L225 27L250 42L275 19L300 32L325 8L350 28L375 15L400 4"
                fill="none"
                stroke="#467b3b"
                strokeWidth="3"
              />
            </svg>
            <div className="mt-6 space-y-3 text-sm">
              {[
                ['/', '1,608'],
                ['/journal', '1,240'],
                ['/about', '780'],
              ].map(([page, count]) => (
                <div key={page} className="flex justify-between rounded-lg bg-paper px-3 py-2">
                  <span>{page}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-ink/70 text-xs">A preview of the dashboard. Illustrative data.</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 className="max-w-lg font-semibold text-4xl tracking-tight">
            Less digging.
            <br />
            More understanding.
          </h2>
          <p className="max-w-xs text-ink/70">The numbers you actually need, in one calm place.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[
            ['01', 'Know your audience', 'See visitors, pageviews, and activity at a glance. Get a useful answer without building a report.'],
            ['02', 'Find what works', 'Discover your most visited pages and the sources sending people your way.'],
            ['03', 'Keep it simple', 'One small script. One clear dashboard. All your websites together.'],
          ].map(([number, title, body]) => (
            <article key={number} className="rounded-2xl border border-ink/15 p-7">
              <p className="text-ink/50 text-sm">{number}</p>
              <h3 className="mt-8 font-semibold text-xl">{title}</h3>
              <p className="mt-3 text-ink/70 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="pricing" className="mx-auto mt-20 max-w-6xl scroll-mt-8 px-6">
        <div className="max-w-2xl">
          <p className="font-bold text-xs uppercase tracking-[0.2em]">Simple pricing</p>
          <h2 className="mt-4 font-semibold text-4xl tracking-tight sm:text-5xl">Everything included. No trade-offs.</h2>
          <p className="mt-5 max-w-xl text-ink/70 text-lg leading-relaxed">Start at $4 per month for 50,000 monthly pageviews. Choose the capacity that fits your websites.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article key={plan.name} className={`flex flex-col rounded-2xl border p-7 ${plan.featured ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white'}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-2xl">{plan.name}</h3>
                {plan.featured && <span className="rounded-full bg-accent px-3 py-1 font-bold text-[0.65rem] text-ink uppercase tracking-wider">Popular</span>}
              </div>
              <p className={`mt-7 font-semibold text-4xl tracking-tight ${plan.name === 'Expand' ? 'text-2xl' : ''}`}>
                {plan.monthly}
                {plan.name !== 'Expand' && <span className="ml-1 font-normal text-base">/ month</span>}
              </p>
              <p className={`mt-2 text-sm ${plan.featured ? 'text-white/70' : 'text-ink/65'}`}>
                {plan.yearly}
                {plan.name !== 'Expand' && <span> yearly — save 20%</span>}
              </p>
              <dl className={`mt-8 space-y-3 border-t pt-6 text-sm ${plan.featured ? 'border-white/20' : 'border-ink/15'}`}>
                <div className="flex justify-between gap-4">
                  <dt className={plan.featured ? 'text-white/70' : 'text-ink/65'}>Monthly pageviews</dt>
                  <dd className="font-semibold">{plan.pageviews}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className={plan.featured ? 'text-white/70' : 'text-ink/65'}>Sites</dt>
                  <dd className="font-semibold">{plan.sites}</dd>
                </div>
              </dl>
              <Link
                href={plan.name === 'Expand' ? 'mailto:hello@pulsio.live' : `/start-tracking?plan=${plan.name.toLowerCase()}`}
                className={`mt-8 rounded-full px-5 py-3 text-center font-semibold text-sm ${plan.featured ? 'bg-accent text-ink' : 'bg-paper text-ink'}`}
              >
                {plan.name === 'Expand' ? 'Contact us ↗' : `Choose ${plan.name} ↗`}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
