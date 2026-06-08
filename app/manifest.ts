import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CaseBrain Hub',
    short_name: 'CaseBrain',
    description: 'AI paralegal for modern litigation teams',
    start_url: '/',
    display: 'standalone',
    background_color: '#050814',
    theme_color: '#06B6D4',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

