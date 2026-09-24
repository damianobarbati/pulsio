import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { createPageMetadata, getWebsiteConfig } from '../seo';

const sections = [
  { id: 'getting-started', label: 'Getting started' },
  { id: 'tracking', label: 'Tracking script' },
  { id: 'dashboard', label: 'Home' },
  { id: 'reports', label: 'Reports and filters' },
  { id: 'goals', label: 'Goals and revenue' },
  { id: 'journeys', label: 'User journeys' },
  { id: 'websites', label: 'Websites and groups' },
  { id: 'agency', label: 'Agency tools' },
  { id: 'privacy', label: 'Privacy and data' },
  { id: 'account', label: 'Account and billing' },
];

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({
    title: 'Documentation',
    description: 'Complete documentation for Pulsio website analytics, reporting, conversion tracking, and agency tools.',
    path: '/documentation',
    siteUrl: new URL(config.WEBSITE_URL),
  });
};

const Code = ({ children }: { children: string }) => (
  <pre className="mt-5 overflow-x-auto rounded-[var(--radius-sm)] bg-pulsio-ink p-5 text-sm text-white leading-relaxed">
    <code>{children}</code>
  </pre>
);

export default function Documentation() {
  return (
    <div className="mx-auto max-w-[1400px] px-6 py-12 lg:grid lg:grid-cols-[15rem_minmax(0,48rem)] lg:justify-center lg:gap-16 lg:py-16">
      <aside className="mb-10 lg:mb-0">
        <nav aria-label="Documentation sections" className="lg:sticky lg:top-8">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Documentation</p>
          <ol className="mt-4 flex gap-x-4 gap-y-2 overflow-x-auto pb-2 text-sm lg:flex-col lg:gap-1 lg:overflow-visible">
            {sections.map((section) => (
              <li key={section.id} className="shrink-0">
                <a href={`#${section.id}`} className="block rounded-[var(--radius-sm)] px-3 py-2 text-ink/70 hover:bg-blue-100 hover:text-ink">
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
      <article className="min-w-0">
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Pulsio platform guide</p>
        <h1 className="mt-4 font-bold text-4xl tracking-tighter sm:text-6xl">Everything you can do with Pulsio.</h1>
        <p className="mt-6 max-w-2xl text-ink/75 text-lg leading-relaxed">
          Install a lightweight script, understand website activity, measure outcomes, and share clear results with your team or clients.
        </p>

        <section id="getting-started" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Getting started</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Create an account with an email address, password, and website domain. Pulsio creates a unique tracking snippet for the website. Add it to the <code>&lt;head&gt;</code>{' '}
            of every page, publish, then visit the website to confirm the first signal.
          </p>
          <p className="mt-4 text-ink/75 leading-relaxed">
            After detection, open the dashboard to see visitors, pages, sources, and other reports. Add more websites to the same account at any time.
          </p>
          <Link href="/start-tracking" className="mt-6 inline-block font-bold text-pulsio-blue underline underline-offset-4">
            Create account and start tracking
          </Link>
        </section>

        <section id="tracking" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Tracking script</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            The script automatically records page views, single-page application navigation, referrers, UTM parameters, device context, engagement time, and maximum scroll depth.
            It uses <code>sendBeacon</code> when available so tracking does not delay navigation.
          </p>
          <Code>{'<script async src="https://your-api.example/client.js" data-pulsio-id="YOUR_SITE_ID"></script>'}</Code>
          <h3 className="mt-8 font-bold text-xl">Custom events</h3>
          <p className="mt-3 text-ink/75 leading-relaxed">
            Send named events from JavaScript with optional properties. Property values can be text, numbers, or booleans. Use events for actions such as signups, CTA clicks, or
            completed flows.
          </p>
          <Code>{"window.pulsio('Signup', { props: { plan: 'pro' } });"}</Code>
          <h3 className="mt-8 font-bold text-xl">Element and automatic tracking</h3>
          <p className="mt-3 text-ink/75 leading-relaxed">
            Add <code>data-pulsio-event-name</code> to an element to track clicks. Add <code>data-pulsio-trigger="display"</code> to send an event once when an element becomes
            visible. Enable automatic outbound link, download, form submission, or 404 tracking with a comma-separated <code>data-track</code> value on the script.
          </p>
          <Code>
            {
              '<script async src="https://your-api.example/client.js" data-pulsio-id="YOUR_SITE_ID" data-track="outbound,downloads,forms"></script>\n<button data-pulsio-event-name="Demo requested">Request a demo</button>\n<section data-pulsio-event-name="Pricing viewed" data-pulsio-trigger="display">...</section>'
            }
          </Code>
        </section>

        <section id="dashboard" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Dashboard</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            The overview compares the selected period with the previous equivalent period. Choose 1, 7, 28, 90, or 365 days, or set a custom UTC date range.
          </p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-ink/75">
            <li>Live visitor count and pages viewed during the last five minutes, refreshed every three seconds.</li>
            <li>Visitors, visits, page views, views per visit, bounce rate, visit duration, time on page, and scroll depth.</li>
            <li>Interactive timeline for each metric, including the change from the previous period.</li>
            <li>Live and overview data update automatically while the dashboard is open.</li>
          </ul>
        </section>

        <section id="reports" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Reports and filters</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Reports show ranked rows and can expand to include share, page views, visits, bounce rate, duration, time on page, scroll depth, and exit rate. Select a row to filter
            the full dashboard and drill into related dimensions.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ['Acquisition', 'Channels, sources, referrers, and UTM campaign, source, medium, content, and term.'],
              ['Content', 'Top pages, entry pages, and exit pages.'],
              ['Location', 'Interactive world map plus countries, regions, and cities.'],
              ['Technology', 'Browsers and versions, operating systems and versions, and devices.'],
              ['Custom data', 'Event names, event properties, and hostnames.'],
              ['Filtering', 'Combine page, traffic, campaign, location, technology, hostname, event, and property filters with is, is not, or contains.'],
            ].map(([title, text]) => (
              <div key={title} className="rounded-[var(--radius-sm)] bg-blue-100 p-5">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-ink/75 text-sm leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="goals" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Goals and revenue</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Create conversion goals from a custom event, a page path, or a scroll threshold. Page paths support wildcards. Event goals can require matching custom properties. Every
            goal reports unique conversions, total conversions, conversion rate, and attributed revenue.
          </p>
          <p className="mt-4 text-ink/75 leading-relaxed">
            To record revenue, send a unique transaction ID and an amount with a three-letter currency code. You can include optional item details. Revenue reporting displays total
            revenue, average revenue, and order count by currency.
          </p>
          <Code>
            {
              "window.pulsio('purchase_completed', {\n  transaction_id: 'order_123',\n  revenue: { amount: 29, currency: 'EUR' },\n  items: [{ sku: 'PRO', name: 'Pro plan', quantity: 1, amount: 29 }]\n});"
            }
          </Code>
          <p className="mt-4 text-ink/75 text-sm leading-relaxed">
            Use browser events for marketing analytics. For accounting-grade records, use payment-provider webhooks or server-side tracking.
          </p>
        </section>

        <section id="journeys" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">User journeys</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Start with a page or event and explore what visitors did next, or what happened before it. Pulsio lists each journey step with its source, destination, and visitor
            count. Journey analysis respects the selected websites, date range, filters, and goal selection.
          </p>
        </section>

        <section id="websites" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Websites and groups</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Manage multiple websites from one workspace. Switch the dashboard between individual websites or select several websites for a combined view. Save up to five website
            selections as named groups for quick reuse, then remove groups you no longer need.
          </p>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Each website keeps its own snippet and first-signal status. Workspace settings let you add websites and remove all analytics events for an individual website when
            necessary.
          </p>
        </section>

        <section id="agency" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Agency tools</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Agency tools turn website analytics into a client-ready service. Configure your agency name and logo once, then manage sharing and reports separately for each client
            website.
          </p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-ink/75">
            <li>Create password-free shared dashboard links with a client label.</li>
            <li>Choose whether a shared dashboard can display revenue.</li>
            <li>Revoke any shared link at any time.</li>
            <li>Schedule weekly or monthly email reports to one or more recipients.</li>
            <li>Enable, disable, and send a test for each scheduled report.</li>
          </ul>
        </section>

        <section id="privacy" className="scroll-mt-8 border-ink/15 border-b py-12">
          <h2 className="font-bold text-3xl tracking-tight">Privacy and data</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Pulsio tracking operates without cookies. The tracker removes URL fragments, credentials, and most query parameters before collection; it retains UTM parameters and
            common search terms for attribution. It records a pseudonymous page identifier, not a visitor profile.
          </p>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Do not send names, email addresses, payment card data, or other personal data in custom event properties. You remain responsible for informing visitors and obtaining
            consent or another legal basis where required.
          </p>
          <Link href="/privacy" className="mt-5 inline-block font-bold text-pulsio-blue underline underline-offset-4">
            Read Privacy Policy
          </Link>
        </section>

        <section id="account" className="scroll-mt-8 py-12">
          <h2 className="font-bold text-3xl tracking-tight">Account and billing</h2>
          <p className="mt-4 text-ink/75 leading-relaxed">
            Your workspace includes account access, website management, and subscription settings. Select a monthly or yearly plan, review billing status, and manage your
            subscription from the workspace. When a trial ends or payment is overdue, Pulsio continues to collect events while dashboard charts remain paused until a plan is
            active.
          </p>
          <p className="mt-4 text-ink/75 leading-relaxed">You can delete an account and its recorded website data from workspace settings. This action is permanent.</p>
        </section>
      </article>
    </div>
  );
}
