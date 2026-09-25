'use client';

import cx from 'clsx-tw';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from 'ui/form';

const plans = [
  { name: 'Start', sites: 1, price: 4 },
  { name: 'Grow', sites: 5, price: 10 },
  { name: 'Scale', sites: 20, price: 30 },
  { name: 'Expand', sites: Infinity, price: 99 },
];

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const AgencyCalculator = ({ className }: { className?: string }) => {
  const form = useForm({ defaultValues: { sites: 5, price: 50 } });
  const [sites, setSites] = React.useState(5);
  const [price, setPrice] = React.useState(50);
  const plan = plans.find((item) => sites <= item.sites) || plans[plans.length - 1];
  const revenue = sites * price - plan.price;
  return (
    <FormProvider {...form}>
      <section className={cx('rounded-3xl bg-pulsio-ink p-6 text-white sm:p-10', className)}>
        <p className="font-bold text-lime-300 text-xs uppercase tracking-wider">Agency calculator</p>
        <h2 className="mt-3 font-bold text-3xl tracking-tight">See your tracking revenue.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="agency-sites" className="font-bold text-sm">
              Sites you track
            </label>
            <Input name="sites" id="agency-sites" type="number" min="1" value={sites} onChange={(event) => setSites(Math.max(1, Number(event.target.value)))} className="mt-2" />
          </div>
          <div>
            <label htmlFor="agency-price" className="font-bold text-sm">
              Monthly price per client site
            </label>
            <Input
              name="price"
              id="agency-price"
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(event) => setPrice(Math.max(0, Number(event.target.value)))}
              className="mt-2"
            />
          </div>
        </div>
        <div className="mt-8 rounded-2xl bg-white p-6 text-pulsio-ink">
          <p className="text-pulsio-muted text-sm">
            Minimum Pulsio plan:{' '}
            <strong className="text-pulsio-ink">
              {plan.name} · {money.format(plan.price)}/month
            </strong>
          </p>
          <p className="mt-3 font-bold text-3xl">
            {money.format(revenue)} <span className="font-normal text-base">monthly revenue</span>
          </p>
          <p className="mt-3 text-pulsio-muted text-sm">
            {sites} sites × {money.format(price)} − {money.format(plan.price)} Pulsio monthly cost
          </p>
        </div>
      </section>
    </FormProvider>
  );
};
