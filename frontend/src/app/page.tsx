import React from 'react';
import type { Metadata } from 'next';
import { HomePage } from '@/pages/HomePage';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wavelink.app';

export const metadata: Metadata = {
  title: 'WaveLink - Nền Tảng Nghe Audio Từ Video YouTube Tắt Màn Hình',
  description:
    'Thưởng thức sách nói, podcast, bài giảng, âm nhạc trọn vẹn từ video YouTube mà không cần bật sáng màn hình. Tự động hẹn giờ tắt nhạc, trải nghiệm mượt mà, tiện lợi.',
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootHomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'WaveLink Audio',
        description: 'Nghe Audio Từ Video YouTube Không Bị Gián Đoạn',
        potentialAction: [
          {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${siteUrl}/library?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        ],
      },
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'WaveLink Audio',
        url: siteUrl,
        logo: `${siteUrl}/wavelink-icon.png`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePage />
    </>
  );
}
