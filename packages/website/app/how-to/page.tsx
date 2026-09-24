import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { createPageMetadata, getWebsiteConfig } from '../seo';

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({
    title: 'How website analytics works',
    description: 'Create a Pulsio account, add one tracking snippet, and see website analytics in a few simple steps.',
    path: '/how-to',
    siteUrl: new URL(config.WEBSITE_URL),
  });
};

export default function HowTo() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-bold text-xs uppercase tracking-widest">How it works</p>
      <h1 className="mt-5 font-semibold text-5xl tracking-tight sm:text-6xl">
        From install to insight.
        <br />
        In a few small steps.
      </h1>
      <p className="mt-6 max-w-xl text-ink/70 text-lg">No card needed to check your installation. Make sure everything works, then explore your analytics.</p>
      <ol className="mt-14 space-y-5">
        {[
          ['Create your account', 'Enter your email, choose a password, and add your website domain. We prepare your personal tracking snippet immediately.'],
          [
            'Copy one line of code',
            'Paste the snippet inside the <head> of every page you want to track, or into your website builder’s custom code settings. Publish the change.',
          ],
          [
            'Watch the first signal arrive',
            'Visit your website in another tab. Keep the setup page open: it checks for your first signal automatically and confirms when tracking is detected.',
          ],
          ['Explore your dashboard', 'Open your admin to see visitors, top pages, and traffic sources. Add more websites to the same account. Everything is free for now.'],
        ].map(([title, body], index) => (
          <li key={title} className="flex gap-6 rounded-2xl border border-ink/15 bg-white p-7">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-bold">{index + 1}</span>
            <div>
              <h2 className="font-semibold text-xl">{title}</h2>
              <p className="mt-3 text-ink/70 leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-10 rounded-2xl bg-ink/5 p-7">
        <h2 className="font-semibold text-xl">Always in control</h2>
        <p className="mt-3 text-ink/75">
          Manage multiple websites from one account. Each website has its own installation snippet and analytics. No payment or subscription is required.
        </p>
      </div>
      <div className="mt-10 rounded-2xl bg-ink/5 p-7">
        <h2 className="font-semibold text-xl">Revenue and campaigns</h2>
        <p className="mt-3 text-ink/75">
          Track checkout_viewed when checkout becomes visible, checkout_started on payment action, and purchase_completed only after payment confirmation.
        </p>
        <pre className="mt-4 overflow-auto rounded bg-white p-4 text-sm">{`window.pulsio('purchase_completed', {\n  transaction_id: 'order_123',\n  revenue: { amount: 58, currency: 'EUR' },\n  items: [{ sku: 'PRO', name: 'Pro plan', quantity: 1, amount: 58 }]\n});`}</pre>
        <p className="mt-3 text-ink/75">
          Transaction IDs are required for revenue and must be unique per site. Product items are optional but require revenue. Use UTM source, medium, and campaign in landing
          links; campaign attribution lasts for one active 30-minute visit. Browser tracking supports marketing analytics. Use payment provider webhooks or server tracking for
          accounting-grade revenue.
        </p>
      </div>
      <Link href="/start-tracking" className="mt-9 inline-block rounded-full bg-ink px-7 py-4 font-semibold text-white">
        Start tracking ↗
      </Link>
    </section>
  );
}
