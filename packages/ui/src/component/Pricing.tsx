'use client';

import cx from 'clsx-tw';
import { capitalize } from 'es-toolkit';
import React from 'react';
import useSWR from 'swr';
import type { IPlan } from 'types/Plan.ts';
import { POST } from '#ui/api/fetchers.ts';
import { Button } from '#ui/component/Button.tsx';

export type PricingInterval = 'month' | 'year';

type PricingProps = {
  className?: string;
  interval?: PricingInterval;
  onIntervalChange?: (interval: PricingInterval) => void;
  onSelectPlan?: (plan: IPlan.plan) => void;
  selectedPlan?: string;
  currentPlan?: string;
  currency?: string;
};

const getPlanActionLabel = ({ plan, currentPlan, selectedPlan }: { plan: IPlan.plan; currentPlan?: string; selectedPlan?: string }) => {
  if (String(plan.name) === 'custom') return 'Contact sales';
  if (plan.name === currentPlan) return 'Current plan';
  if (plan.name === selectedPlan) return 'Selected';
  return `Choose ${capitalize(plan.name)}`;
};

export const Pricing = ({ className, interval: controlledInterval, onIntervalChange, onSelectPlan, selectedPlan, currentPlan, currency = 'USD' }: PricingProps) => {
  const plansSWR = useSWR<IPlan.listResponse>(['/plan/list'], POST, { shouldRetryOnError: false });
  const [uncontrolledInterval, setUncontrolledInterval] = React.useState<PricingInterval>('month');
  const interval = controlledInterval || uncontrolledInterval;

  const setInterval = (nextInterval: PricingInterval) => {
    setUncontrolledInterval(nextInterval);
    onIntervalChange?.(nextInterval);
  };

  return (
    <div className={cx('contents', className)}>
      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-2 rounded-2xl bg-pulsio-nav p-1 text-left" role="group" aria-label="Billing period">
        {(['month', 'year'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setInterval(value)}
            className={cx('rounded-xl px-4 py-3 text-sm transition', interval === value ? 'bg-white text-pulsio-ink shadow-sm' : 'text-pulsio-muted hover:text-pulsio-ink')}
          >
            {value === 'month' ? 'Monthly' : 'Yearly'}
            {value === 'year' && <span className="ml-1 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] uppercase tracking-wide">2 months free</span>}
          </button>
        ))}
      </div>
      {!plansSWR.data && <p className="mt-8 text-pulsio-muted text-sm">Loading plans...</p>}
      {plansSWR.error && <p className="mt-8 text-red-600 text-sm">Could not load plans.</p>}
      {plansSWR.data && (
        <div className="mt-8 grid place-content-center gap-4 text-left md:grid-flow-col">
          {plansSWR.data.map((plan) => {
            const actionLabel = getPlanActionLabel({ plan, currentPlan, selectedPlan });
            const planName = String(plan.name);
            const isCustom = planName === 'custom';
            const isCurrentPlan = plan.name === currentPlan;
            const isSelectedPlan = plan.name === selectedPlan;
            const rawPrice = interval === 'month' ? plan.monthly_price : plan.yearly_price;
            const price = isCustom ? 'Custom' : new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(rawPrice);
            const websites = isCustom ? 'Custom' : plan.max_domains.toLocaleString('en-US', { notation: 'compact' });
            const events = isCustom ? 'Custom events' : plan.max_events.toLocaleString('en-US', { notation: 'compact' });
            const monitors = isCustom ? 'Custom uptime monitors' : `${(plan.max_domains * 3).toLocaleString('en-US')} uptime monitors`;
            const isHighlightedPlan = (isCurrentPlan && !isSelectedPlan) || isSelectedPlan;

            return (
              <article
                key={plan.id}
                className={cx(
                  'relative z-0 flex w-70 cursor-pointer flex-col rounded-sm border p-6 transition duration-200',
                  isHighlightedPlan && 'border-pulsio-blue bg-blue-50/60 shadow-pulsio ring-0',
                  !isHighlightedPlan && 'border-pulsio-line bg-white transition hover:z-10 hover:scale-105',
                )}
                onClick={() => !isCustom && onSelectPlan?.(plan)}
              >
                <div>
                  <h3 className="font-semibold text-3xl">{capitalize(plan.name)}</h3>
                  <p className="text-pulsio-muted text-sm">{plan.description}</p>
                </div>
                <p className="mt-5 text-4xl text-pulsio-ink tracking-tight">
                  {price}
                  <span className="ml-1 font-normal text-base">/ {interval === 'month' ? 'month' : 'year'}</span>
                </p>
                <ul className="mt-5 mb-5 space-y-1.5 text-pulsio-muted text-sm">
                  <li>
                    <span className="mr-2 text-pulsio-blue">✓</span>
                    <strong>{websites} websites</strong>
                  </li>
                  <li>
                    <span className="mr-2 text-pulsio-blue">✓</span>
                    <strong>{events} events/mo</strong>
                  </li>
                  <li>
                    <span className="mr-2 text-pulsio-blue">✓</span>
                    <strong>{monitors}</strong>
                  </li>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span className="mr-2 text-pulsio-blue">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-auto" disabled={isCustom}>
                  {actionLabel}
                </Button>
              </article>
            );
          })}
        </div>
      )}
      <a className="m-auto mt-4 flex w-max flex-row gap-1 font-bold text-sm" href="/contact-us">
        <span>Need more? Contact us</span>
        <span className="text-pulsio-blue">here</span>
        <span>.</span>
      </a>
    </div>
  );
};
