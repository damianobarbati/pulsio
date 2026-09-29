import cx from 'clsx-tw';
import type { IBilling } from 'types/Billing.ts';
import { Badge, Card } from 'ui';

const formatDate = (value: string) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(Date.parse(value));
const formatAmount = ({ amount, currency }: IBilling.paymentListResponse[number]) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);

export const BillingPaymentHistory = ({ className, payments }: { className?: string; payments: IBilling.paymentListResponse }) => (
  <section className={cx('mt-10', className)} aria-labelledby="payment-history-title">
    <div className="mb-5">
      <h2 id="payment-history-title" className="font-bold text-2xl tracking-tight">
        Payment history
      </h2>
    </div>
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-pulsio-line border-b bg-slate-50 text-pulsio-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pulsio-line">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-5 py-4">{payment.paid_at ? formatDate(payment.paid_at) : 'Unavailable'}</td>
                <td className="px-5 py-4">{formatAmount(payment)}</td>
                <td className="px-5 py-4">
                  <Badge tone={payment.status === 'paid' ? 'success' : 'warning'}>{payment.status}</Badge>
                </td>
                <td className="px-5 py-4 text-right">
                  {payment.invoice_url ? (
                    <a className="font-semibold text-pulsio-blue hover:text-blue-700" href={payment.invoice_url} target="_blank" rel="noreferrer">
                      Download invoice
                    </a>
                  ) : (
                    <span className="text-pulsio-muted">Unavailable</span>
                  )}
                </td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td className="px-5 py-4 text-pulsio-muted" colSpan={4}>
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  </section>
);
