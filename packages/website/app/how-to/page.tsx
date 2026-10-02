import type { Metadata } from 'next';
import { connection } from 'next/server';
import { ApiHowTo } from 'ui/component/ApiHowTo.tsx';
import { createPageMetadata, getWebsiteConfig } from '../seo';

export const generateMetadata = async (): Promise<Metadata> => {
  await connection();
  const config = getWebsiteConfig();
  return createPageMetadata({
    title: 'How to use Pulsio',
    description: 'Learn how to track events, understand website activity, and manage reports, websites, and agency tools with Pulsio.',
    path: '/how-to',
    siteUrl: new URL(config.WEBSITE_URL),
  });
};

export default function HowTo() {
  return <ApiHowTo className="px-6 py-12 sm:py-16" />;
}
