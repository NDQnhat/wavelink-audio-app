import React from 'react';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { AppProviders } from './providers';
import { ClientShell } from './client-shell';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://wavelink.app';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'WaveLink - Nền tảng nghe Audio từ YouTube, Chạy ngầm khi tắt màn hình',
    template: '%s | WaveLink Audio',
  },
  description:
    'Nghe trọn vẹn audio từ video YouTube khi tắt màn hình, tiết kiệm pin và dữ liệu. Tìm kiếm và thưởng thức sách nói, podcast, talkshow, bài hát từ link YouTube nhanh chóng trên WaveLink.',
  keywords: [
    'nghe audio youtube',
    'audio youtube tắt màn hình',
    'phát nhạc youtube chạy ngầm',
    'sách nói youtube',
    'podcast youtube việt nam',
    'youtube to audio',
    'wavelink audio app',
  ],
  authors: [{ name: 'WaveLink Team', url: siteUrl }],
  creator: 'WaveLink',
  publisher: 'WaveLink',
  manifest: '/manifest.json',
  icons: {
    icon: '/wavelink-icon.png',
    apple: '/wavelink-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: siteUrl,
    siteName: 'WaveLink Audio',
    title: 'WaveLink - Nghe Audio Video YouTube Tắt Màn Hình',
    description:
      'Trải nghiệm nghe audio từ YouTube tiện lợi không bị gián đoạn, hỗ trợ hẹn giờ tắt và điều khiển màn hình khóa.',
    images: [
      {
        url: '/wavelink-icon.png',
        width: 512,
        height: 512,
        alt: 'WaveLink Audio Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WaveLink - Nghe Audio Video YouTube Tắt Màn Hình',
    description:
      'Tìm kiếm và nghe audio từ video YouTube mượt mà, hỗ trợ phát ngầm và hẹn giờ trên điện thoại.',
    images: ['/wavelink-icon.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.min.css"
          crossOrigin="anonymous"
        />
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <AppProviders>
          <ClientShell>{children}</ClientShell>
        </AppProviders>
      </body>
    </html>
  );
}
