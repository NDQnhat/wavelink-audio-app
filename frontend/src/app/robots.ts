import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wavelink.app';

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
