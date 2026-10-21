import { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/siteConfig';

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/home', '/player/', '/community', '/membership', '/profile/'],
      disallow: ['/admin/', '/settings', '/notifications', '/upload', '/library'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
