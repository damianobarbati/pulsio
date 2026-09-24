import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { connection } from 'next/server';
import type React from 'react';
import logo from 'ui/assets/logo.svg';
import './main.css';
import { SiteNavigation } from '../components/SiteNavigation';
import { getWebsiteConfig } from './seo';

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return {
    metadataBase: new URL(config.WEBSITE_URL),
    title: {
      default: 'Pulsio | Premium analytics, made simple',
      template: '%s | Pulsio',
    },
    description: 'Premium analytics made simple, privacy-first, developer-friendly, and fairly priced.',
    applicationName: 'Pulsio',
    manifest: '/manifest.webmanifest',
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    icons: { icon: logo.src, apple: logo.src },
  };
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  await connection();
  const config = getWebsiteConfig();
  const cookie = (await cookies()).toString();
  const accountResponse = await fetch(new URL('/account', config.API_URL), { cache: 'no-store', headers: { cookie } });
  const loggedIn = accountResponse.ok;
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col antialiased">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <header className="bg-pulsio-ink text-white">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-5 px-6 py-2">
            <Link href="/" aria-label="Pulsio home" className="font-black text-2xl tracking-tighter">
              Pulsio
            </Link>
            <SiteNavigation dashboardUrl={config.WEBAPP_URL} loggedIn={loggedIn} />
          </div>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="mx-auto mt-24 flex max-w-6xl flex-wrap justify-between gap-4 border-ink/15 border-t py-4 text-sm">
          <p className="font-bold">Pulsio. Premium analytics, made simple.</p>
          <div className="flex gap-6">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact-us">Contact us</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
