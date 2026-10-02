import cx from 'clsx-tw';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import screenshot from 'ui/assets/screenshot.png';
import { Pricing } from 'ui/component/Pricing.tsx';
import { IBolt, IChart, ILock, IShield } from 'ui/icons.tsx';
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

export default async function Home({ className }: { className?: string }) {
  await connection();
  const config = getWebsiteConfig();
  const siteUrl = new URL(config.WEBSITE_URL);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Pulsio',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Privacy-first website analytics for developers.',
    url: siteUrl.toString(),
  };

  return (
    <div className={cx('contents', className)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="mx-auto grid max-w-[1400px] items-center gap-6 px-6 py-8 lg:grid-cols-[.9fr_1.1fr] lg:py-12">
        <div>
          <h1 className="font-bold text-5xl leading-[1.02] tracking-tighter">
            Premium analytics
            <br />
            <span className="text-pulsio-blue">made simple.</span>
          </h1>
          <p className="mt-7 max-w-xl text-ink/75 text-lg leading-relaxed">
            Understand what happens on your website with live, privacy-friendly analytics.
            <br />
            Track pages, sources, events, conversions, and revenue without adding a visitor profile.
            <br />
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link href="/start-tracking" className="rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
              Use for free
            </Link>
            <a href={`${config.WEBAPP_URL}/share/pulsio`} className="rounded-sm border border-pulsio-line bg-white px-7 py-4 font-bold">
              See live demo
            </a>
          </div>
        </div>
        <div className="bg-blue-100">
          <img src={screenshot.src} />
        </div>
      </section>
      <section className="bg-pulsio-nav py-7">
        <div className="mx-auto grid max-w-[1400px] gap-5 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: 'Live website data', text: 'Monitor current visitors and recent activity from one dashboard.', Icon: IChart },
            { title: 'Cookieless tracking', text: 'Measure website activity without tracking cookies or a cookie banner.', Icon: ILock },
            { title: 'Small client script', text: 'Send page views and events with a lightweight asynchronous script.', Icon: IBolt },
            { title: 'Useful reports', text: 'Explore sources, content, technology, locations, events, and revenue.', Icon: IShield },
          ].map(({ title, text, Icon }) => {
            return (
              <article key={title} className="flex gap-4 border-pulsio-line px-5">
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-sm bg-blue-100 text-pulsio-blue">
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
      <section className="mx-auto max-w-[1400px] px-6 py-16 text-center">
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Simple, transparent pricing</p>
        <h2 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">Start free. Scale when needed.</h2>
        <p className="mt-2 text-pulsio-muted">All plans include real-time analytics, core reports, and privacy-friendly tracking.</p>
        <div id="pricing" className="scroll-mt-0">
          <Pricing />
        </div>
        <aside className="mx-auto mt-12 max-w-3xl rounded-sm bg-pulsio-ink px-6 py-10 text-white sm:px-12">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Start today</p>
          <h2 className="mt-3 font-bold text-3xl tracking-tight">Get started with Pulsio for free.</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/75">Create your account, add one small script, and start seeing your website data.</p>
          <Link href="/start-tracking" className="mt-7 inline-flex rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
            Use for free
          </Link>
        </aside>
      </section>
    </div>
  );
}
