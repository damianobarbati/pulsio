import cx from 'clsx-tw';
import React from 'react';

const MINIMUM_SCREEN_WIDTH = 800;

type Props = { className?: string; children: React.ReactNode };

export const ScreenGuard = ({ className, children }: Props) => {
  const [isDesktop, setIsDesktop] = React.useState(() => window.matchMedia(`(min-width: ${MINIMUM_SCREEN_WIDTH}px)`).matches);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${MINIMUM_SCREEN_WIDTH}px)`);
    const updateScreenSize = () => setIsDesktop(mediaQuery.matches);
    updateScreenSize();
    mediaQuery.addEventListener('change', updateScreenSize);

    return () => mediaQuery.removeEventListener('change', updateScreenSize);
  }, []);

  if (isDesktop) return <div className={cx('contents', className)}>{children}</div>;

  return (
    <div className={cx('min-h-screen w-full', className)}>
      <div className="flex min-h-screen flex-col place-content-center bg-pulsio-surface p-6 text-center">
        <h1 className="mb-2 font-bold text-pulsio-ink text-xl">Display size not supported</h1>
        <p className="text-pulsio-muted">
          This page requires a minimum screen width of
          <span className="font-bold text-pulsio-ink"> {MINIMUM_SCREEN_WIDTH}px </span>for an optimal experience. <br />
          Please resize your browser or switch to a larger display.
        </p>
      </div>
    </div>
  );
};
