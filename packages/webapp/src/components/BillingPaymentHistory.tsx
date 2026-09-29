import cx from 'clsx-tw';
import { Badge, Card } from 'ui';
import { IDownload } from 'ui/icons.tsx';

type Payment = { id: string; date: string; plan: string; amount: string; status: string };
const payments: Payment[] = [
  { id: 'INV-2026-08', date: 'Aug 6, 2026', plan: 'Pro yearly', amount: '$190.00', status: 'Paid' },
  { id: 'INV-2025-08', date: 'Aug 6, 2025', plan: 'Pro yearly', amount: '$190.00', status: 'Paid' },
];

const downloadInvoice = (payment: Payment) => {
  const invoice = `PULSIO\nInvoice ${payment.id}\nDate: ${payment.date}\nPlan: ${payment.plan}\nTotal: ${payment.amount}\nStatus: ${payment.status}`;
  const blob = new Blob([invoice], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${payment.id}.txt`;
  link.click();
  URL.revokeObjectURL(url);
};

export const BillingPaymentHistory = ({ className }: { className?: string }) => (
  <section className={cx('mt-10', className)} aria-labelledby="payment-history-title">
    <div className="mb-5">
      <h2 id="payment-history-title" className="font-bold text-2xl tracking-tight">
        Payment history
      </h2>
    </div>
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="border-pulsio-line border-b bg-slate-50 text-pulsio-muted text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Amount</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 text-right font-semibold">Invoice</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pulsio-line">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-5 py-4">{payment.date}</td>
                <td className="px-5 py-4 font-medium">{payment.plan}</td>
                <td className="px-5 py-4">{payment.amount}</td>
                <td className="px-5 py-4">
                  <Badge tone="success">{payment.status}</Badge>
                </td>
                <td className="px-5 py-4 text-right">
                  <button type="button" className="inline-flex items-center gap-2 font-semibold text-pulsio-blue hover:text-blue-700" onClick={() => downloadInvoice(payment)}>
                    <IDownload size={16} /> Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </section>
);
