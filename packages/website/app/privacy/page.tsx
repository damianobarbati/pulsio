import cx from 'clsx-tw';
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { createPageMetadata, getWebsiteConfig } from '../seo';

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({ title: 'Privacy Policy', description: 'How Pulsio processes personal data.', path: '/privacy', siteUrl: new URL(config.WEBSITE_URL) });
};

export default function Privacy({ className }: { className?: string }) {
  return (
    <article className={cx('mx-auto max-w-3xl px-6 py-16 text-ink', className)}>
      <Link href="/" className="mb-6 block font-semibold text-pulsio-blue text-sm underline underline-offset-2">
        {'<- go back'}
      </Link>
      <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Legal</p>
      <h1 className="mt-4 font-semibold text-5xl tracking-tight">Privacy Policy</h1>
      <p className="mt-5 text-ink/65">Last updated: 16 September 2026</p>
      <div className="mt-12 space-y-10 text-ink/80 leading-relaxed">
        <section>
          <h2 className="font-semibold text-2xl text-ink">1. Controller</h2>
          <p className="mt-3">
            Damiano Barbati, VAT number IT15365071008, Via dalle Palle 123, [POSTAL CODE AND CITY], Italy, is the controller for personal data processed through Pulsio. Contact:{' '}
            <a className="font-semibold text-pulsio-blue underline" href="mailto:info@pulsio.live">
              info@pulsio.live
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">2. Data we process</h2>
          <p className="mt-3">
            Depending on how you use Pulsio, we process account email address, password hash, website domains, login and session data, billing and subscription details, support
            messages, technical logs, and analytics events sent by websites using the tracking script. Analytics events may include page URL after query-string reduction, referrer
            after reduction, screen size, language, time zone, event name, event properties, engagement data, and a pseudonymous page identifier. Do not send names, email
            addresses, payment card data, or other personal data in event properties.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">3. Purposes and legal bases</h2>
          <p className="mt-3">
            We process data to provide and secure the Service, create and manage accounts, process subscriptions and payments, answer support requests, prevent abuse, maintain
            records, comply with law, and improve reliability. The legal bases are performance of a contract, compliance with legal obligations, legitimate interests in operating
            and securing the Service, and consent where consent is legally required.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">4. Providers and transfers</h2>
          <p className="mt-3">
            We use Hetzner for hosting and infrastructure, Stripe for payment processing, and email or other technical providers needed to operate support and delivery. These
            providers may process data only under appropriate contractual arrangements. Where data leaves the EEA, we use an adequacy decision or another lawful transfer mechanism
            required by GDPR.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">5. Cookies and storage</h2>
          <p className="mt-3">
            Pulsio uses a strictly necessary, HttpOnly session cookie to keep signed-in users authenticated. We do not intentionally use advertising cookies or third-party tracking
            cookies on the website. The Pulsio tracking script is configured to operate without cookies. If this changes, we will update this Policy and provide any consent
            mechanism required by law.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">6. Retention</h2>
          <p className="mt-3">
            We keep account and billing records for as long as needed to provide the Service and meet legal, tax, accounting, security, and dispute-resolution obligations. When an
            account is deleted, we delete active account and analytics data within a reasonable operational period, except for information that must be retained. Encrypted backups
            may persist until their normal rotation cycle.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">7. Your rights</h2>
          <p className="mt-3">
            Subject to legal limits, you may request access, correction, deletion, restriction, portability, or objection to processing, and withdraw consent where processing
            relies on consent. Contact info@pulsio.live. You may also complain to the data protection authority in your country. If you use Pulsio for another person’s data, you
            remain responsible for informing them and responding to their requests where you are the controller.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">8. Security and changes</h2>
          <p className="mt-3">
            We use reasonable technical and organisational measures, but no internet service can guarantee absolute security. We may update this Policy when our processing or legal
            obligations change. The current version is published on this page.
          </p>
        </section>
      </div>
    </article>
  );
}
