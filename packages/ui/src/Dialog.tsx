import type React from 'react';
import { Button } from './Button.tsx';

type DialogProps = { open: boolean; title: string; children: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onClose: () => void; busy?: boolean };
export const Dialog = ({ open, title, children, confirmLabel = 'Confirm', onConfirm, onClose, busy }: DialogProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-pulsio-ink/40 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-md rounded-[var(--radius-lg)] bg-white p-6 shadow-pulsio">
        <h2 id="dialog-title" className="font-semibold text-xl">
          {title}
        </h2>
        <div className="mt-3 text-pulsio-muted text-sm">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
};
