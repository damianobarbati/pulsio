import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { createPageMetadata, getWebsiteConfig } from '../seo';

const lastUpdated = '16 September 2026';

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({ title: 'Terms of Service', description: 'The terms that govern use of Pulsio.', path: '/terms', siteUrl: new URL(config.WEBSITE_URL) });
};

export default function Terms() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 text-ink">
      <Link href="/" className="mb-6 block font-semibold text-pulsio-blue text-sm underline underline-offset-2">
        {'<- go back'}
      </Link>
      <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Legal</p>
      <h1 className="mt-4 font-semibold text-5xl tracking-tight">Terms of Service</h1>
      <p className="mt-5 text-ink/65">Last updated: {lastUpdated}</p>
      <div className="mt-12 space-y-10 text-ink/80 leading-relaxed">
        <section>
          <h2 className="font-semibold text-2xl text-ink">1. Operator and agreement</h2>
          <p className="mt-3">
            These Terms of Service (the “Terms”) govern access to and use of Pulsio, including its website analytics software, tracking script, dashboard, support and related
            services (the “Service”). The Service is operated by Damiano Barbati, VAT number IT15365071008, with a contact address at Via dalle Palle 123, [POSTAL CODE AND CITY],
            Italy, and email address info@pulsio.live (the “Operator”).
          </p>
          <p className="mt-3">
            By creating an account, selecting “I agree”, purchasing a plan, or using the Service, you accept these Terms. If you act for a business, you confirm that you have
            authority to bind it.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">2. Service and eligibility</h2>
          <p className="mt-3">
            Pulsio provides hosted website analytics. The Service may change, be corrected, or be discontinued in whole or in part. We do not promise that every feature will remain
            available or that the Service will meet every particular requirement.
          </p>
          <p className="mt-3">
            You must be legally able to enter a contract. If you are a consumer, you keep all mandatory rights granted by the law of your country. If you are under the age required
            to contract, use the Service only with the consent of a parent or legal guardian.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">3. Account and security</h2>
          <p className="mt-3">
            You must provide accurate information and keep your credentials confidential. You are responsible for activity under your account and for ensuring that all people who
            use it follow these Terms. Notify us promptly of unauthorised access. We may suspend or restrict an account where this is reasonably necessary for security,
            non-payment, misuse, or legal compliance.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">4. Acceptable use</h2>
          <p className="mt-3">
            You must use the Service lawfully and only for websites and data that you are authorised to monitor. You must not: interfere with the Service; bypass limits or
            security; reverse engineer it except where mandatory law permits; introduce malware; infringe another person’s rights; collect sensitive or personal data without a
            lawful basis; or use Pulsio for unlawful surveillance, discrimination, fraud, spam, or other harmful activity.
          </p>
          <p className="mt-3">You are responsible for informing visitors to your websites and for obtaining any consent or other legal basis required for your use of analytics.</p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">5. Customer data and privacy</h2>
          <p className="mt-3">
            You retain rights in data submitted to Pulsio. You grant the Operator the limited, non-exclusive right to host, transmit, process, secure, and display that data only to
            provide, maintain, and improve the Service, prevent abuse, and comply with law. You must not submit data that you are not authorised to provide.
          </p>
          <p className="mt-3">
            Our{' '}
            <Link className="font-semibold text-pulsio-blue underline" href="/privacy">
              Privacy Policy
            </Link>{' '}
            explains how we process personal data. Business customers must contact us before submitting personal data that requires a data processing agreement.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">6. Plans, trials and payment</h2>
          <p className="mt-3">
            The applicable plan, limits, price, currency, billing interval, taxes and trial terms are shown at checkout or in the account. Prices are currently displayed in USD and
            may be subject to applicable taxes. Paid subscriptions renew automatically for the same interval until cancelled. Stripe processes payments under its own terms and
            privacy notice.
          </p>
          <p className="mt-3">
            A cancellation normally takes effect at the end of the current paid period. We may suspend access for failed or overdue payment. Fees already paid are not refundable
            except where required by law, where we fail to provide the paid Service, or where we expressly agree otherwise.
          </p>
          <p className="mt-3">
            Consumers normally have a 14-day withdrawal right for distance contracts. Where lawful, that right may not apply after a consumer expressly asks us to start supplying
            the digital service during that period and acknowledges the resulting legal consequences. Nothing here removes a mandatory consumer right.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">7. Intellectual property</h2>
          <p className="mt-3">
            The Service, software, design, documentation, trademarks and related materials belong to the Operator or its licensors. We grant you a limited, revocable,
            non-transferable licence to use the Service during the applicable subscription. You must not copy, resell, sublicense, or commercially exploit the Service except as
            expressly allowed by these Terms. Feedback may be used without restriction.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">8. Availability, maintenance and third parties</h2>
          <p className="mt-3">
            The Service may be unavailable or degraded because of maintenance, updates, failures, internet or telecommunications problems, cyberattacks, hosting or third-party
            services, force majeure, or events outside our reasonable control. We may change limits, features, infrastructure, or providers when reasonably needed to operate the
            Service. No uptime commitment applies unless a separate written agreement says so.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">9. Disclaimers and limitation of liability</h2>
          <p className="mt-3">
            To the maximum extent permitted by law, the Service is provided “as is” and “as available”. We disclaim warranties not expressly required by law, including
            uninterrupted availability, error-free operation, fitness for a particular purpose, accuracy of analytics, and preservation of data.
          </p>
          <p className="mt-3">
            To the maximum extent permitted by law, the Operator is not liable for indirect, incidental, special, punitive, exemplary, or consequential loss; loss of profits,
            revenue, business, goodwill, expected savings, or data; or claims arising from your websites, your content, your visitors, your configuration, or your unlawful use of
            the Service.
          </p>
          <p className="mt-3">
            For business customers, the Operator’s total aggregate liability arising out of or related to the Service is limited to the fees paid by that customer for the Service
            during the 12 months before the event giving rise to the claim, or EUR 100 if no fees were paid. This limitation does not apply where liability cannot legally be
            limited, including for death or personal injury caused by negligence, wilful misconduct, fraud, or mandatory consumer rights.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">10. Indemnity for business customers</h2>
          <p className="mt-3">
            To the extent permitted by law, a business customer will defend and indemnify the Operator against third-party claims, losses and reasonable costs arising from its
            breach of these Terms, unlawful use of the Service, or data and content supplied by it. This section does not apply to consumers.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">11. Suspension, termination and deletion</h2>
          <p className="mt-3">
            You may stop using the Service and request account deletion at any time. We may suspend or terminate access for material breach, unlawful conduct, security risk,
            non-payment, inactivity, or discontinuation of the Service. We will use reasonable efforts to provide notice where practical, but immediate action may be taken when
            needed to protect the Service, users, or comply with law.
          </p>
          <p className="mt-3">
            After termination, we may retain information where required for legal, accounting, security, dispute-resolution, or backup purposes. Otherwise, account and analytics
            data will be deleted according to our Privacy Policy and operational retention practices.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">12. Changes to these Terms</h2>
          <p className="mt-3">
            We may update these Terms when the Service, business, or applicable law changes. The new version will be posted on this page with a new “Last updated” date. It applies
            from publication for new users and, for existing users, from the stated effective date. Where the law requires advance notice or a new acceptance, we will provide it.
            If a change materially harms your rights, you may stop using the Service or cancel before it takes effect. Continued use after the effective date means acceptance of
            the updated Terms.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-2xl text-ink">13. Law and contact</h2>
          <p className="mt-3">
            These Terms are governed by Italian law, without depriving consumers of mandatory protections in the country where they live. Disputes with business customers will be
            submitted to the courts of Italy, subject to any mandatory jurisdiction rules. Consumers may use any court or alternative dispute-resolution right available under
            applicable law.
          </p>
          <p className="mt-3">
            Contact:{' '}
            <a className="font-semibold text-pulsio-blue underline" href="mailto:info@pulsio.live">
              info@pulsio.live
            </a>
            . Please include enough information for us to identify your account and request.
          </p>
        </section>
      </div>
    </article>
  );
}
