import cx from 'clsx-tw';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

type SpinnerProps = {
  className?: string;
  centered?: boolean;
  size?: SpinnerSize;
};

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-10 w-10 border-4',
  xl: 'h-16 w-16 border-[6px]',
};

export const Spinner = ({ className, centered = true, size = 'md' }: SpinnerProps) => {
  return (
    <span
      role="status"
      aria-label="Loading..."
      className={cx(
        'box-border inline-block animate-spin rounded-full border-pulsio-line border-t-pulsio-blue',
        sizeClasses[size],
        centered && 'sticky top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2',
        className,
      )}
    />
  );
};
