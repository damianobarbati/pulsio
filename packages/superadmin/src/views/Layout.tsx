import cx from 'clsx-tw';
import type React from 'react';
import { Nav } from '#superadmin/components/Nav.tsx';

type LayoutProps = {
  className?: string;
  children: React.ReactNode;
};

export const Layout = ({ className, children }: LayoutProps) => {
  return (
    <div className={cx('min-h-screen lg:flex', className)}>
      <Nav />
      <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-9 lg:py-6">{children}</main>
    </div>
  );
};
