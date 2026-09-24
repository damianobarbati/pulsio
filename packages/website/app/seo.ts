import type { Metadata } from 'next';
import { z } from 'zod';

const configSchema = z.object({
  API_URL: z.url(),
  WEBSITE_URL: z.url(),
  WEBAPP_URL: z.url(),
});

export const getWebsiteConfig = () => configSchema.parse(process.env);

type PageMetadataInput = {
  description: string;
  path: string;
  siteUrl: URL;
  title: string;
};

export const createPageMetadata = ({ description, path, siteUrl, title }: PageMetadataInput): Metadata => {
  const url = new URL(path, siteUrl);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      siteName: 'Pulsio',
      locale: 'en_US',
      images: [{ url: new URL('/opengraph-image', siteUrl), width: 1200, height: 630, alt: 'Pulsio. Premium analytics, made simple.' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [new URL('/opengraph-image', siteUrl)],
    },
  };
};
