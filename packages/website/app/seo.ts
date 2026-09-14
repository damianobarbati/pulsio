import type { Metadata } from 'next';

export const siteUrl = new URL(process.env.WEBSITE_URL as string);

type PageMetadataInput = {
  description: string;
  path: string;
  title: string;
};

export const createPageMetadata = ({ description, path, title }: PageMetadataInput): Metadata => {
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
