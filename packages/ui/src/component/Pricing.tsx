'use client';

import cx from 'clsx-tw';
import { capitalize } from 'es-toolkit';
import React from 'react';
import useSWR from 'swr';
import type { Plan, PlanListResponse } from 'types/Plan.ts';
import { POST } from '#ui/api/fetchers.ts';
import { Button } from '#ui/component/Button.tsx';

export type PricingInterval = 'month' | 'year';

type PricingProps = {
  className?: string;
  interval?: PricingInterval;
  onIntervalChange?: (interval: PricingInterval) => void;
  onSelectPlan?: (plan: Plan) => void;
  selectedPlan?: string;
  currentPlan?: string;
  currency?: string;
};

const getPlanActionLabel = ({ plan, currentPlan, selectedPlan }: { plan: Plan; currentPlan?: string; selectedPlan?: string }) => {
  if (plan.name === currentPlan) return 'Current plan';
  if (plan.name === selectedPlan) return 'Selected';
  return `Choose ${capitalize(plan.name)}`;
};

export const Pricing = ({ className, interval: controlledInterval, onIntervalChange, onSelectPlan, selectedPlan, currentPlan, currency = 'USD' }: PricingProps) => {
  const plansSWR = useSWR<PlanListResponse>(['/plan/list'], POST, { shouldRetryOnError: false });
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
            {value === 'year' && <span className="ml-1 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] uppercase tracking-wide">Save 20%</span>}
          </button>
        ))}
      </div>
      {!plansSWR.data && <p className="mt-8 text-pulsio-muted text-sm">Loading plans...</p>}
      {plansSWR.error && <p className="mt-8 text-red-600 text-sm">Could not load plans.</p>}
      {plansSWR.data && (
        <div className="mt-8 grid gap-5 text-left md:grid-cols-4">
          {plansSWR.data.map((plan) => {
            const actionLabel = getPlanActionLabel({ plan, currentPlan, selectedPlan });
            const isCurrentPlan = plan.name === currentPlan;
            const isSelectedPlan = plan.name === selectedPlan;
            const rawPrice = interval === 'month' ? plan.monthly_price : plan.yearly_price;
            const price = rawPrice ? new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(rawPrice) : 'Free';
            const isHighlightedPlan = (isCurrentPlan && !isSelectedPlan) || isSelectedPlan;

            return (
              <article
                key={plan.id}
                className={cx(
                  'relative z-0 flex cursor-pointer flex-col rounded-sm border p-6 transition duration-200',
                  isHighlightedPlan && 'border-pulsio-blue bg-blue-50/60 shadow-pulsio ring-0',
                  !isHighlightedPlan && 'border-pulsio-line bg-white transition hover:z-10 hover:scale-105',
                )}
                onClick={() => onSelectPlan?.(plan)}
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
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <span className="mr-2 text-pulsio-blue">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-auto">{actionLabel}</Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
