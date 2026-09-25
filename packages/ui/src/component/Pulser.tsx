import cx from 'clsx-tw';

type PulserProps = {
  className?: string;
  label?: string;
  active?: boolean;
};

export const Pulser = ({ className, label = 'Loading', active = true }: PulserProps) => (
  <span role="status" aria-label={label} className={cx('relative inline-flex h-5 w-5 items-center justify-center', className)}>
    {active && <span className="absolute h-full w-full animate-ping rounded-full bg-current opacity-30 motion-reduce:animate-none" />}
    <small className="h-2/5 w-2/5 rounded-full bg-current" />
  </span>
);
