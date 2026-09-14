import type { Metadata } from 'next';
import Link from 'next/link';
import type React from 'react';
import './globals.css';
import { siteUrl } from './seo';

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: 'Pulsio | Premium analytics, made simple',
    template: '%s | Pulsio',
  },
  description: 'Premium analytics made simple, privacy-first, developer-friendly, and fairly priced.',
  applicationName: 'Pulsio',
  manifest: '/manifest.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-5 px-6 py-7">
          <Link href="/" aria-label="Pulsio home" className="font-black text-3xl tracking-tighter">
            pulsio<span className="text-lime-600">.</span>
          </Link>
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-6 font-semibold text-sm">
            <Link href="/how-to">How to</Link>
            <Link href="/#pricing">Pricing</Link>
            <a href={process.env.WEBAPP_URL}>Log in</a>
            <Link href="/start-tracking" className="rounded-full bg-ink px-5 py-3 text-white">
              Start tracking ↗
            </Link>
          </nav>
        </header>
        <main id="main">{children}</main>
        <footer className="mx-auto mt-24 flex max-w-6xl flex-wrap justify-between gap-4 border-ink/15 border-t px-6 py-8 text-sm">
          <p className="font-bold">Pulsio. Premium analytics, made simple.</p>
          <div className="flex gap-6">
            <Link href="/how-to">How to</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/start-tracking">Start tracking</Link>
            <span>From $4 / month</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
