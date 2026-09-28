import type { MetadataRoute } from 'next';
// import { getWebsiteConfig } from './seo';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };

  // const siteUrl = new URL(getWebsiteConfig().WEBSITE_URL);
  // return {
  //   rules: {
  //     userAgent: '*',
  //     allow: '/',
  //     disallow: ['/start-tracking'],
  //   },
  //   sitemap: new URL('/sitemap.xml', siteUrl).toString(),
  //   host: siteUrl.toString(),
  // };
}
