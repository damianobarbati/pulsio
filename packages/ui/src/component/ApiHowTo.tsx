import cx from 'clsx-tw';

type CodeBlockProps = {
  children: string;
  className?: string;
};

const CodeBlock = ({ children, className }: CodeBlockProps) => (
  <pre className={cx('overflow-x-auto rounded-sm bg-slate-950 p-4 text-slate-100 text-sm leading-relaxed', className)}>
    <code>{children}</code>
  </pre>
);

type ApiHowToProps = {
  className?: string;
  userId?: string;
};

export const ApiHowTo = ({ className, userId = 'YOUR_USER_ID' }: ApiHowToProps) => {
  return (
    <article className={cx('mx-auto max-w-5xl', className)}>
      <header className="max-w-3xl">
        <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">How to</p>
        <h1 className="mt-4 font-bold tracking-tight sm:text-5xl">Track events with the Pulsio client.</h1>
        <p className="mt-5 text-lg text-pulsio-muted leading-relaxed">
          Install the client once, then use HTML attributes or JavaScript to track custom events and revenue from your website.
        </p>
      </header>

      <div className="mt-10 space-y-6">
        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">01</p>
          <h2 className="mt-2 font-bold text-2xl tracking-tight">Install the client</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Add this script inside the <code className="rounded bg-pulsio-nav px-1.5 py-0.5 text-xs">&lt;head&gt;</code> of every page you want to track. Replace the ID with the ID
            from your Pulsio tracking setup.
          </p>
          <CodeBlock className="mt-5">{`<script async
  src="https://api.pulsio.live/client.js"
  data-pulsio-id="${userId}"
></script>`}</CodeBlock>
          <p className="mt-3 text-pulsio-muted text-sm leading-relaxed">
            The client automatically sends page views, engagement, interaction, and scroll data. It also supports single page application navigation.
          </p>
        </section>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">02</p>
          <h2 className="mt-2 font-bold text-2xl tracking-tight">Track custom events with HTML</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Add <code className="rounded bg-pulsio-nav px-1.5 py-0.5 text-xs">data-pulsio-event</code> and{' '}
            <code className="rounded bg-pulsio-nav px-1.5 py-0.5 text-xs">data-pulsio-trigger</code> to any HTML element.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              ['present', 'Sends once when the element exists in the DOM. Hidden elements are supported.'],
              ['visible', 'Sends once when the element enters the viewport.'],
              ['click', 'Sends on every trusted click on the element or one of its children.'],
            ].map(([trigger, description]) => (
              <div key={trigger} className="rounded-sm bg-pulsio-nav p-4">
                <code className="font-bold text-pulsio-blue text-sm">{trigger}</code>
                <p className="mt-2 text-pulsio-muted text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
          <CodeBlock className="mt-5">
            {'<button\n  data-pulsio-event="signup_started"\n  data-pulsio-trigger="click"\n  data-pulsio-props=\'{"plan":"pro","seats":1}\'\n>\n  Start free trial\n</button>'}
          </CodeBlock>
          <p className="mt-3 text-pulsio-muted text-sm leading-relaxed">
            Event properties must be a JSON object. Values can be strings or numbers. Use the exact event names and property names that you want to see in reports.
          </p>
        </section>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">03</p>
          <h2 className="mt-2 font-bold text-2xl tracking-tight">Track custom events with JavaScript</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Call <code className="rounded bg-pulsio-nav px-1.5 py-0.5 text-xs">window.pulsio</code> after the client script has loaded.
          </p>
          <CodeBlock className="mt-5">{"window.pulsio('signup_started', {\n  props: { plan: 'pro', seats: 1 }\n});"}</CodeBlock>
          <p className="mt-3 text-pulsio-muted text-sm leading-relaxed">
            JavaScript calls accept the same optional event data as the DOM API. Use this method when an event is created by application logic rather than a single HTML element.
          </p>
        </section>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">04</p>
          <h2 className="mt-2 font-bold text-2xl tracking-tight">Track revenue</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Send a transaction ID, amount, and three-letter uppercase currency code together. Keep the transaction ID unique for each order.
          </p>
          <h3 className="mt-6 font-semibold text-lg">JavaScript API</h3>
          <CodeBlock className="mt-3">
            {
              "window.pulsio('purchase', {\n  transaction_id: 'order_789',\n  revenue_amount: 1000,\n  revenue_currency: 'EUR',\n  items: [\n    { id: '123', name: 'Product 123', quantity: 1, price: 1000 }\n  ]\n});"
            }
          </CodeBlock>
          <h3 className="mt-6 font-semibold text-lg">DOM API</h3>
          <CodeBlock className="mt-3">
            {
              '<input\n  type="hidden"\n  data-pulsio-event="purchase"\n  data-pulsio-trigger="present"\n  data-pulsio-transaction-id="order_789"\n  data-pulsio-revenue-amount="1000"\n  data-pulsio-revenue-currency="EUR"\n  data-pulsio-items=\'[{"id":"123","name":"Product 123","quantity":1,"price":1000}]\'\n/>'
            }
          </CodeBlock>
          <p className="mt-3 text-pulsio-muted text-sm leading-relaxed">
            Item data is optional. Each item needs an ID, name, positive integer quantity, and positive price. For DOM tracking,{' '}
            <code className="rounded bg-pulsio-nav px-1.5 py-0.5 text-xs">checkout</code> and <code className="rounded bg-pulsio-nav px-1.5 py-0.5 text-xs">purchase</code> require
            all three revenue attributes.
          </p>
        </section>

        <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:p-7">
          <h2 className="font-bold text-xl">Keep event data safe</h2>
          <p className="mt-2 text-sm leading-relaxed">
            Do not send names, email addresses, payment card data, or other personal data in event properties. Use browser events for analytics and keep accounting-grade records in
            your payment provider or server-side systems.
          </p>
        </aside>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <p className="font-bold text-pulsio-blue text-xs uppercase tracking-widest">Use Pulsio</p>
          <h2 className="mt-2 font-bold text-2xl tracking-tight">Understand website activity</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            The Home view compares the selected period with the previous equivalent period. Choose 1, 7, 28, 90, or 365 days, or set a custom UTC date range.
          </p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-pulsio-muted leading-relaxed">
            <li>View live visitors and pages viewed during the last five minutes. Data refreshes every 60 seconds.</li>
            <li>Review visitors, visits, page views, bounce rate, visit duration, time on page, and scroll depth.</li>
            <li>Compare each metric with the previous period in its interactive timeline.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <h2 className="font-bold text-2xl tracking-tight">Explore reports and filters</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Reports show ranked rows for acquisition, content, location, technology, and custom data. Select a row to filter the dashboard and inspect related dimensions.
          </p>
          <ul className="mt-5 list-disc space-y-2 pl-5 text-pulsio-muted leading-relaxed">
            <li>Analyze channels, referrers, and UTM campaigns.</li>
            <li>Review top, entry, and exit pages.</li>
            <li>Inspect countries, regions, cities, browsers, operating systems, and devices.</li>
            <li>Combine page, traffic, campaign, location, technology, hostname, event, and property filters.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <h2 className="font-bold text-2xl tracking-tight">Manage websites and agency tools</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Manage multiple websites from one workspace. Each website has its own tracking snippet and first-signal status. Select one or more websites for individual or combined
            views.
          </p>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Agency tools let you set your account name, logo, and dashboard color. Create password-free shared dashboard links, choose whether they show revenue, and schedule
            daily, weekly, or monthly email reports for each client website.
          </p>
        </section>

        <section className="rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio sm:p-7">
          <h2 className="font-bold text-2xl tracking-tight">Privacy, account, and billing</h2>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Pulsio works without cookies. It removes URL fragments, credentials, and most query parameters before collection, while retaining UTM parameters and common search terms
            for attribution. It records a pseudonymous page identifier, not a visitor profile.
          </p>
          <p className="mt-3 text-pulsio-muted leading-relaxed">
            Workspace settings provide account access, website management, subscription management, and permanent account deletion. Select a monthly or yearly plan and review
            billing status from the workspace.
          </p>
        </section>
      </div>
    </article>
  );
};
