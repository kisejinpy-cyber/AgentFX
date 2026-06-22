import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://meridian-treasury.io';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard', // Private app page
          '/api/*',     // API endpoints
          '/_next/*',   // Internal Next.js files
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
