import cx from 'clsx-tw';
import React from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import type { IBilling } from 'types/Billing.ts';
import type { IPlan } from 'types/Plan.ts';
import { Badge, Button, Card, Pricing, Spinner } from 'ui';
import { GET, MPOST, POST } from 'ui/api/fetchers.ts';
import { ICard } from 'ui/icons.tsx';
import { BillingPaymentHistory } from '#webapp/components/BillingPaymentHistory.tsx';

type BillingCycle = 'month' | 'year';

const formatDate = (value: string | null) => (value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(Date.parse(value)) : 'No renewal scheduled');

export const Billing = ({ className }: { className?: string }) => {
  const summarySWR = useSWR<IBilling.summary>(['/billing/summary'], GET, { suspense: true, shouldRetryOnError: false });
  const paymentsSWR = useSWR<IBilling.paymentListResponse>(['/billing/payments'], GET, { shouldRetryOnError: false });
  const plansSWR = useSWR<IPlan.listResponse>(['/plan/list'], POST, { suspense: true, shouldRetryOnError: false });
  const checkout = useSWRMutation<IBilling.checkoutResponse, Error, string, IBilling.checkoutRequest>('/billing/checkout', MPOST);
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>('year');
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null);
  const summary = summarySWR.data;
  const selected = plansSWR.data?.find((plan) => plan.name === selectedPlan);
  const canCheckout = !!selected && selected.name !== 'custom' && (selected.name !== summary?.plan.name || !summary.subscription);

  const startCheckout = async () => {
    if (!selected || !canCheckout || checkout.isMutating) return;
    const result = await checkout.trigger({ plan: selected.name, recurrence: billingCycle });
    window.location.assign(result.url);
  };

  if (!summary) return <Spinner size="lg" />;

  return (
    <div className={cx('mx-auto max-w-6xl', className)}>
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="mt-3 flex flex-row items-center gap-2 font-bold text-3xl tracking-tight sm:text-4xl">
          <ICard />
          Billing
        </h1>
      </header>
      <Card className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-pulsio-muted text-sm">Current plan</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-xl">{summary.plan.name[0].toUpperCase() + summary.plan.name.slice(1)}</h2>
            <Badge tone={summary.subscription?.status === 'canceled' ? 'error' : 'success'}>{summary.subscription?.status ?? 'Active'}</Badge>
          </div>
          <p className="mt-1 text-pulsio-muted text-sm">Next billing date: {formatDate(summary.next_billing_at)}</p>
        </div>
      </Card>
      <section aria-labelledby="plans-title">
        <div className="mb-5">
          <h2 id="plans-title" className="font-bold text-2xl tracking-tight">
            Choose your plan
          </h2>
          <p className="mt-1 text-pulsio-muted text-sm">Change your plan or billing frequency at any time.</p>
        </div>
        <Pricing
          interval={billingCycle}
          onIntervalChange={setBillingCycle}
          onSelectPlan={(plan) => setSelectedPlan(plan.name)}
          selectedPlan={selectedPlan ?? undefined}
          currentPlan={summary.plan.name}
        />
        {canCheckout && selected && (
          <Card className="mt-5 flex flex-col gap-4 border-blue-200 bg-blue-50/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">Continue with {selected.name}</p>
              <p className="mt-1 text-pulsio-muted text-sm">Checkout opens in Stripe.</p>
            </div>
            <Button size="lg" onClick={startCheckout} disabled={checkout.isMutating}>
              {checkout.isMutating ? 'Opening checkout...' : 'Choose plan & continue'}
            </Button>
          </Card>
        )}
        {checkout.error && <p className="mt-4 text-red-600 text-sm">Could not open Stripe Checkout. Please try again.</p>}
      </section>
      <BillingPaymentHistory payments={paymentsSWR.data ?? []} />
    </div>
  );
};

export default Billing;
