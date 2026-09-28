import type { MetadataRoute } from 'next';
import logo from 'ui/assets/logo.svg';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pulsio',
    short_name: 'Pulsio',
    description: 'Premium analytics made simple.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f2',
    theme_color: '#183b36',
    icons: [{ src: logo.src, sizes: 'any', type: 'image/svg+xml' }],
  };
}
