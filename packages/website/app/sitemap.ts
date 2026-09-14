import type { MetadataRoute } from 'next';
import { siteUrl } from './seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl.toString(), changeFrequency: 'weekly', priority: 1 },
    { url: new URL('/how-to', siteUrl).toString(), changeFrequency: 'monthly', priority: 0.8 },
  ];
}
