import { MetadataRoute } from 'next';
import { fetchServerAllAudios } from '@/lib/serverAudio';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wavelink.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const audios = await fetchServerAllAudios();

  const audioEntries: MetadataRoute.Sitemap = audios.map((audio) => ({
    url: `${siteUrl}/player/${audio.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/home`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/community`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/membership`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  return [...staticEntries, ...audioEntries];
}
