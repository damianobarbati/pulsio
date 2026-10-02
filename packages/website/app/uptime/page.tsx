import cx from 'clsx-tw';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata, getWebsiteConfig } from '../seo';

export const generateMetadata = (): Metadata =>
  createPageMetadata({
    title: 'Uptime monitoring',
    description: 'Monitor critical website endpoints every minute with alerts, public status pages, and measured uptime history.',
    path: '/uptime',
    siteUrl: new URL(getWebsiteConfig().WEBSITE_URL),
  });

export default function UptimeLanding({ className }: { className?: string }) {
  return (
    <div className={cx('contents', className)}>
      <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-24">
        <div>
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Pulsio uptime monitoring</p>
          <h1 className="mt-4 max-w-3xl font-bold text-5xl leading-[1.02] tracking-tighter sm:text-6xl">Know when your website is unavailable.</h1>
          <p className="mt-7 max-w-2xl text-ink/75 text-lg leading-relaxed">
            Monitor critical HTTP endpoints every minute. Receive an alert when a service fails, confirm recovery, and share a public status page when needed.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link href="/start-tracking" className="rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
              Start monitoring free
            </Link>
            <a href="#included" className="rounded-sm border border-pulsio-line px-7 py-4 font-bold">
              See what is included
            </a>
          </div>
        </div>
        <aside className="rounded-3xl bg-pulsio-ink p-7 text-white sm:p-9">
          <p className="font-bold text-lime-300 text-xs uppercase tracking-wider">Included with every plan</p>
          <p className="mt-5 font-bold text-4xl tracking-tight">3 monitors</p>
          <p className="mt-1 text-white/75">per included website</p>
          <div className="mt-8 space-y-4 border-white/15 border-t pt-6 text-sm">
            <p>
              <strong>1-minute checks</strong>
              <br />
              HTTP endpoint checks run every minute.
            </p>
            <p>
              <strong>About 43,200 checks monthly</strong>
              <br />
              for each active monitor.
            </p>
            <p>
              <strong>No separate uptime bill</strong>
              <br />
              Monitoring capacity grows with your plan.
            </p>
          </div>
        </aside>
      </section>
      <section id="included" className="scroll-mt-8 bg-pulsio-nav py-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Simple monitoring</p>
          <h2 className="mt-3 max-w-2xl font-bold text-3xl tracking-tight sm:text-4xl">The information needed to respond to downtime.</h2>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ['Failure and recovery alerts', 'Send email when an endpoint is down and when it responds again.'],
              ['Protected endpoint checks', 'Use request headers when a health endpoint requires authentication.'],
              ['Public status pages', 'Share current state and measured availability without sharing your account.'],
              ['Measured uptime history', 'Calculate uptime from actual checks, not a service-level agreement.'],
            ].map(([title, description]) => (
              <article key={title} className="rounded-2xl bg-white p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-pulsio-muted text-sm leading-relaxed">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-wider">Start with Pulsio</p>
        <h2 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">Add monitoring without another tool or subscription.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-pulsio-muted leading-relaxed">
          Create an account, add your endpoint, and receive alerts from the same workspace as your website analytics.
        </p>
        <Link href="/start-tracking" className="mt-8 inline-flex rounded-sm bg-pulsio-blue px-7 py-4 font-bold text-white">
          Start monitoring free
        </Link>
      </section>
    </div>
  );
}
