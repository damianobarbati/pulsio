import cx from 'clsx-tw';
import type React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'success' | 'warning' | 'error' };
const tones = { neutral: 'bg-pulsio-nav text-pulsio-ink', success: 'bg-lime-100 text-lime-800', warning: 'bg-amber-100 text-amber-900', error: 'bg-red-100 text-red-800' };
export const Badge = ({ className, tone = 'neutral', ...props }: BadgeProps) => (
  <span className={cx('inline-flex items-center rounded-full px-2.5 py-1 font-semibold text-xs', tones[tone], className)} {...props} />
);
