'use client';

import Link from 'next/link';
import React from 'react';
import { IClose, IMenuBars } from 'ui/icons.tsx';

type SiteNavigationProps = {
  dashboardUrl: string;
  loggedIn: boolean;
};

export const SiteNavigation = ({ dashboardUrl, loggedIn: initialLoggedIn }: SiteNavigationProps) => {
  const [loggedIn, setLoggedIn] = React.useState(initialLoggedIn);
  const [menuOpen, setMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const markAuthenticated = () => setLoggedIn(true);
    window.addEventListener('pulsio:authenticated', markAuthenticated);
    return () => window.removeEventListener('pulsio:authenticated', markAuthenticated);
  }, []);

  return (
    <>
      <button
        type="button"
        className="ml-auto rounded-[var(--radius-sm)] p-2 md:hidden"
        aria-controls="site-navigation"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        onClick={() => setMenuOpen((isOpen) => !isOpen)}
      >
        {menuOpen ? <IClose aria-hidden="true" size={24} /> : <IMenuBars aria-hidden="true" size={24} />}
      </button>
      <nav
        id="site-navigation"
        aria-label="Main navigation"
        className={`${menuOpen ? 'flex' : 'hidden'} basis-full flex-col items-stretch gap-4 py-3 font-medium text-sm md:ml-8 md:flex md:grow md:flex-row md:flex-wrap md:items-center md:justify-items-start md:gap-6 md:py-0`}
      >
        <Link href="/how-to">How to</Link>
        <Link href="/documentation">Documentation</Link>
        <Link href="/for-agency">For agencies</Link>
        <Link href="/#pricing">Pricing</Link>
        <a href={dashboardUrl} className="md:ml-auto">
          {loggedIn ? 'My Home' : 'Sign in'}
        </a>
        <Link href="/start-tracking" className="rounded-[var(--radius-sm)] bg-pulsio-blue px-3 py-2 text-white md:ml-0">
          Get started free
        </Link>
      </nav>
    </>
  );
};
