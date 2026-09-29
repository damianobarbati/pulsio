import cx from 'clsx-tw';
import React from 'react';
import type { Plan } from 'types/Plan.ts';
import { Alert, Badge, Button, Card, Pricing } from 'ui';
import { ICard, ICheck } from 'ui/icons.tsx';
import { BillingDetailsForm } from '#webapp/components/BillingDetailsForm.tsx';
import { BillingPaymentHistory } from '#webapp/components/BillingPaymentHistory.tsx';

type BillingCycle = 'monthly' | 'yearly';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const demoBillingDetails = { company: 'Rossi Studio LLC', vatNumber: 'US123456789', address: '18 Main Street', city: 'New York', country: 'United States' };

export const Billing = ({ className }: { className?: string }) => {
  const [billingCycle, setBillingCycle] = React.useState<BillingCycle>('yearly');
  const [currentPlan, setCurrentPlan] = React.useState('start');
  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [billingDetails, setBillingDetails] = React.useState<typeof demoBillingDetails | null>(null);
  const [showBillingForm, setShowBillingForm] = React.useState(false);
  const [isConfirmed, setIsConfirmed] = React.useState(false);

  const hasPlanChange = !!selectedPlan && selectedPlan.name !== currentPlan;

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsConfirmed(false);
    setShowBillingForm(false);
  };

  const continueToPayment = () => {
    if (!selectedPlan) return;
    if (selectedPlan.name === 'start') {
      setCurrentPlan('start');
      setIsConfirmed(true);
      return;
    }
    setShowBillingForm(true);
    setIsConfirmed(false);
  };

  const confirmPayment = (details: typeof demoBillingDetails) => {
    if (!selectedPlan) return;
    setBillingDetails(details);
    setCurrentPlan(selectedPlan.name);
    setShowBillingForm(false);
    setIsConfirmed(true);
  };

  return (
    <div className={cx('mx-auto max-w-6xl', className)}>
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="mt-3 flex flex-row items-center gap-2 font-bold text-3xl tracking-tight sm:text-4xl">
          <ICard />
          Billing
        </h1>
      </header>

      <Card className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div>
            <p className="font-semibold text-pulsio-muted text-sm">Current plan</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-xl">{currentPlan === 'free' ? 'Free' : `${currentPlan.slice(0, 1).toUpperCase()}${currentPlan.slice(1)}`}</h2>
              <Badge tone="success">Active</Badge>
            </div>
            <p className="mt-1 text-pulsio-muted text-sm">{currentPlan === 'free' ? 'No renewal scheduled' : `Renews ${billingCycle === 'yearly' ? 'yearly' : 'monthly'}`}</p>
          </div>
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
          interval={billingCycle === 'yearly' ? 'year' : 'month'}
          onIntervalChange={(interval) => setBillingCycle(interval === 'year' ? 'yearly' : 'monthly')}
          onSelectPlan={selectPlan}
          selectedPlan={selectedPlan?.name}
          currentPlan={currentPlan}
        />

        {hasPlanChange && selectedPlan && (
          <Card className="mt-5 border-blue-200 bg-blue-50/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Switch to {selectedPlan.name}</p>
                <p className="mt-1 text-pulsio-muted text-sm">
                  {selectedPlan.name === 'start'
                    ? 'The plan will be free.'
                    : `${currency.format(billingCycle === 'yearly' ? selectedPlan.yearly_price : selectedPlan.monthly_price)} / ${billingCycle === 'yearly' ? 'year' : 'month'}. Recurring payment with Stripe.`}
                </p>
              </div>
              <Button size="lg" onClick={continueToPayment}>
                Continue
              </Button>
            </div>
          </Card>
        )}
        {showBillingForm && selectedPlan && (
          <BillingDetailsForm
            initialValues={billingDetails || demoBillingDetails}
            plan={selectedPlan}
            cycle={billingCycle}
            onCancel={() => setShowBillingForm(false)}
            onConfirm={confirmPayment}
          />
        )}
        {isConfirmed && (
          <Alert tone="success" className="mt-5 flex items-start gap-3">
            <ICheck className="mt-0.5 shrink-0" />
            <span>
              <strong>Plan updated.</strong> Your {selectedPlan?.name || 'Free'} plan is now active. In production, Stripe would process the payment.
            </span>
          </Alert>
        )}
      </section>

      <BillingPaymentHistory />
    </div>
  );
};

export default Billing;
