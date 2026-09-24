import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import screenshot from 'ui/assets/screenshot.png';
import { IBolt, IChart, ILock, IShield } from 'ui/icons.tsx';
import { Pricing } from '../components/Pricing';
import { createPageMetadata, getWebsiteConfig } from './seo';

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({
    title: 'Premium analytics, made simple',
    description: 'Privacy-first website analytics for developers. See visitors, pageviews, top pages, and traffic sources without the noise.',
    path: '/',
    siteUrl: new URL(config.WEBSITE_URL),
  });
};

const planDetails = [
  {
    name: 'Start',
    plan: 'start',
    description: 'Perfect for personal projects.',
    features: ['Up to 50,000 page views / month', 'Core analytics', 'Real-time visitors', 'Email support'],
  },
  {
    name: 'Grow',
    plan: 'grow',
    description: 'For growing websites.',
    features: ['Up to 250,000 page views / month', 'All analytics reports', 'Custom events', 'Multiple websites'],
    featured: true,
  },
  {
    name: 'Scale',
    plan: 'scale',
    description: 'For high-traffic businesses.',
    features: ['Up to 1,000,000 page views / month', 'All Pro features', 'Multiple websites', 'Priority support'],
  },
  {
    name: 'Expand',
    plan: 'expand',
    description: 'For high-traffic businesses.',
    features: ['Up to 1,000,000 page views / month', 'All Pro features', 'Multiple websites', 'Priority support'],
  },
];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export default async function Home() {
  await connection();
  const config = getWebsiteConfig();
  const pricesResponse = await fetch(new URL('/plans', config.API_URL), { cache: 'no-store' });
  const prices = pricesResponse.ok ? ((await pricesResponse.json()) as { name: string; monthly_price: number; yearly_price: number }[]) : [];
  const pricesByName = new Map(prices.map((price) => [price.name, price]));
  const plans = planDetails.map((plan) => {
    const price = pricesByName.get(plan.plan);
    return { ...plan, monthly: currency.format(price?.monthly_price || 0), yearly: currency.format(price?.yearly_price || 0) };
  });
  const siteUrl = new URL(config.WEBSITE_URL);
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
      description: `${plan.name} plan with ${plan.features[0].toLowerCase()}.`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="mx-auto grid max-w-[1400px] items-center gap-6 px-6 py-8 lg:grid-cols-[.9fr_1.1fr] lg:py-12">
        <div>
          <h1 className="font-bold text-5xl leading-[1.02] tracking-tighter">
            Premium analytics
            <br />
            <span className="text-pulsio-blue">made simple.</span>
          </h1>
          <p className="mt-7 max-w-xl text-ink/75 text-lg leading-relaxed">
            See what’s happening on your website in real time.
            <br />
            Privacy-first, developer-friendly, fairly priced.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link href="/start-tracking" className="rounded-[var(--radius-sm)] bg-pulsio-blue px-7 py-4 font-bold text-white">
              Get started free
            </Link>
            <a href="#pricing" className="rounded-[var(--radius-sm)] border border-pulsio-line bg-white px-7 py-4 font-bold">
              See live demo
            </a>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-pulsio-muted text-sm">
            <li>✓ No credit card required</li>
            <li>✓ Set up in minutes</li>
            <li>✓ Privacy-friendly</li>
          </ul>
        </div>
        <div className="bg-blue-100">
          <img src={screenshot.src} />
        </div>
      </section>
      <section className="bg-pulsio-nav py-7">
        <div className="mx-auto grid max-w-[1400px] gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Real-time insights', text: 'See what’s happening as it happens.', Icon: IChart },
            { title: 'Privacy by design', text: 'No cookies, no personal data, no compromises.', Icon: ILock },
            { title: 'Blazing fast', text: 'Lightweight, modern and built for performance.', Icon: IBolt },
            { title: 'Made for builders', text: 'All the data you need, none of the clutter.', Icon: IShield },
          ].map(({ title, text, Icon }) => {
            return (
              <article key={title} className="flex gap-4 border-pulsio-line px-5 lg:border-r">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[var(--radius-md)] bg-blue-100 text-pulsio-blue">
                  <Icon size={28} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-bold">{title}</h2>
                  <p className="mt-1 text-pulsio-muted text-sm">{text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section id="pricing" className="mx-auto max-w-[1400px] scroll-mt-8 px-6 py-16 text-center">
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Simple, transparent pricing</p>
        <h2 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">Start free. Scale when you’re ready.</h2>
        <p className="mt-2 text-pulsio-muted">All plans include real-time analytics, core reports, and privacy-friendly tracking.</p>
        <Pricing plans={plans} />
      </section>
    </>
  );
}
