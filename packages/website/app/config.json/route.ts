import { getWebsiteConfig } from '../seo';

export const dynamic = 'force-dynamic';

export const GET = () => {
  const config = getWebsiteConfig();
  return Response.json({ API_URL: config.API_URL }, { headers: { 'Cache-Control': 'no-store' } });
};
