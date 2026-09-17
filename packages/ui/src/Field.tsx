import type React from 'react';

type FieldProps = { label: string; hint?: string; error?: string; children: React.ReactNode };
export const Field = ({ label, hint, error, children }: FieldProps) => (
  <label className="block font-semibold text-pulsio-ink text-sm">
    <span>{label}</span>
    <div className="mt-2">{children}</div>
    {error ? (
      <span role="alert" className="mt-2 block font-normal text-red-700 text-xs">
        {error}
      </span>
    ) : hint ? (
      <span className="mt-2 block font-normal text-pulsio-muted text-xs">{hint}</span>
    ) : null}
  </label>
);
