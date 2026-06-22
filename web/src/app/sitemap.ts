import { MetadataRoute } from 'next';
import { blogPosts } from '@/lib/blog';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://meridian-treasury.io';

  // Core public routes to index
  const staticRoutes = ['', '/about', '/contact', '/docs', '/faq', '/privacy', '/terms', '/blog'];

  const sitemapEntries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : (route === '/docs' || route === '/blog') ? 0.9 : 0.7,
  }));

  // Dynamic blog routes
  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedDate,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...sitemapEntries, ...blogEntries];
}
