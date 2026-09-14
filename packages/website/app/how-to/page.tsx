import type { Metadata } from 'next';
import Link from 'next/link';
import { createPageMetadata } from '../seo';

export const metadata: Metadata = createPageMetadata({
  title: 'How website analytics works',
  description: 'Create a Pulsio account, add one tracking snippet, and see website analytics in a few simple steps.',
  path: '/how-to',
});

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
      <Link href="/start-tracking" className="mt-9 inline-block rounded-full bg-ink px-7 py-4 font-semibold text-white">
        Start tracking ↗
      </Link>
    </section>
  );
}
