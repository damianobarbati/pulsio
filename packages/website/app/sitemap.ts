import type { MetadataRoute } from 'next';
import { getWebsiteConfig } from './seo';

export const dynamic = 'force-dynamic';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = new URL(getWebsiteConfig().WEBSITE_URL);
  return [
    { url: siteUrl.toString(), changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/how-to', siteUrl).toString(), changeFrequency: 'monthly', priority: 0.8 },
  ];
}
