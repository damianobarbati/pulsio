import cx from 'clsx-tw';
import React from 'react';
import type { Plan } from 'types/Plan.ts';
import { Button, Card } from 'ui';
import { ILock } from 'ui/icons.tsx';

type BillingDetails = { company: string; vatNumber: string; address: string; city: string; country: string };
type BillingCycle = 'monthly' | 'yearly';
type BillingDetailsFormProps = {
  className?: string;
  initialValues: BillingDetails;
  plan: Plan;
  cycle: BillingCycle;
  onCancel: () => void;
  onConfirm: (details: BillingDetails) => void;
};

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const BillingDetailsForm = ({ className, initialValues, plan, cycle, onCancel, onConfirm }: BillingDetailsFormProps) => {
  const [values, setValues] = React.useState(initialValues);
  const price = cycle === 'yearly' ? plan.yearly_price : plan.monthly_price;
  const updateValue = (field: keyof BillingDetails, value: string) => setValues((current) => ({ ...current, [field]: value }));

  return (
    <Card className={cx('mt-5', className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-pulsio-blue text-sm">Last step</p>
          <h3 className="mt-1 font-bold text-xl">Enter billing details</h3>
          <p className="mt-1 text-pulsio-muted text-sm">We use these details for Stripe invoices. You can edit them from Account.</p>
        </div>
        <span className="hidden rounded-full bg-blue-50 p-3 text-pulsio-blue sm:block">
          <ILock size={18} />
        </span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(values);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="pulsio-control sm:col-span-2">
            <span className="pulsio-control-label">Company name</span>
            <input className="pulsio-control-input" required value={values.company} onChange={(event) => updateValue('company', event.target.value)} />
          </label>
          <label className="pulsio-control">
            <span className="pulsio-control-label">Tax ID</span>
            <input className="pulsio-control-input" required value={values.vatNumber} onChange={(event) => updateValue('vatNumber', event.target.value)} />
          </label>
          <label className="pulsio-control">
            <span className="pulsio-control-label">Country</span>
            <select className="pulsio-control-input" value={values.country} onChange={(event) => updateValue('country', event.target.value)}>
              <option>United States</option>
              <option>Italy</option>
              <option>France</option>
              <option>Germany</option>
              <option>Spain</option>
            </select>
          </label>
          <label className="pulsio-control sm:col-span-2">
            <span className="pulsio-control-label">Address</span>
            <input className="pulsio-control-input" required value={values.address} onChange={(event) => updateValue('address', event.target.value)} />
          </label>
          <label className="pulsio-control sm:col-span-2">
            <span className="pulsio-control-label">City</span>
            <input className="pulsio-control-input" required value={values.city} onChange={(event) => updateValue('city', event.target.value)} />
          </label>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-3 border-pulsio-line border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-pulsio-muted text-sm">
            Total:{' '}
            <strong className="text-pulsio-ink">
              {currency.format(price)} / {cycle === 'yearly' ? 'year' : 'month'}
            </strong>
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Confirm and pay</Button>
          </div>
        </div>
      </form>
    </Card>
  );
};
