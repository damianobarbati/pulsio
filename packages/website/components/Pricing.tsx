'use client';

import Link from 'next/link';
import React from 'react';

type PricingPlan = {
  name: string;
  plan: string;
  monthly: string;
  yearly: string;
  description: string;
  features: string[];
  featured?: boolean;
};
type PricingProps = { plans: PricingPlan[] };

export const Pricing = ({ plans }: PricingProps) => {
  const [interval, setInterval] = React.useState<'month' | 'year'>('month');

  return (
    <>
      <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-2 rounded-2xl bg-pulsio-nav p-1 text-left" role="group" aria-label="Billing period">
        <button
          type="button"
          aria-pressed={interval === 'month'}
          onClick={() => setInterval('month')}
          className={`rounded-xl px-4 py-3 font-bold text-sm transition ${interval === 'month' ? 'bg-white text-pulsio-ink shadow-sm' : 'text-pulsio-muted hover:text-pulsio-ink'}`}
        >
          Monthly
        </button>
        <button
          type="button"
          aria-pressed={interval === 'year'}
          onClick={() => setInterval('year')}
          className={`rounded-xl px-4 py-3 font-bold text-sm transition ${interval === 'year' ? 'bg-white text-pulsio-ink shadow-sm' : 'text-pulsio-muted hover:text-pulsio-ink'}`}
        >
          Yearly <span className="ml-1 rounded-full bg-lime-200 px-2 py-0.5 text-[10px] uppercase tracking-wide">Save 20%</span>
        </button>
      </div>
      <div className="mt-2 text-pulsio-muted text-sm">Save 20% when billed annually.</div>
      <div className="mt-8 grid gap-5 text-left md:grid-cols-4">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col rounded-[var(--radius-md)] border p-6 ${plan.featured ? 'border-2 border-pulsio-blue bg-white shadow-pulsio' : 'border-pulsio-line bg-white'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <p className="text-nowrap text-pulsio-muted text-sm">{plan.description}</p>
              </div>
              {plan.featured && (
                <span className="text-nowrap rounded-full bg-pulsio-blue px-3 py-1 font-bold text-[0.65rem] text-white uppercase tracking-wider">Most popular</span>
              )}
            </div>
            <p className="mt-5 font-bold text-4xl tracking-tight">
              {interval === 'month' ? plan.monthly : plan.yearly}
              <span className="ml-1 font-normal text-base">/ {interval === 'month' ? 'month' : 'year'}</span>
            </p>
            <ul className="mt-5 space-y-1.5 text-pulsio-muted text-sm">
              {plan.features.map((feature) => (
                <li key={feature}>
                  <span className="mr-2 text-pulsio-blue">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={`/start-tracking?plan=${plan.plan}`}
              className={`mt-7 rounded-[var(--radius-sm)] px-5 py-3 text-center font-bold text-sm ${plan.featured ? 'bg-pulsio-blue text-white' : 'border border-pulsio-line text-pulsio-ink'}`}
            >
              Choose {plan.name}
            </Link>
          </article>
        ))}
      </div>
    </>
  );
};
