import React from 'react';
import type { Metadata } from 'next';
import { UploadPage } from '@/pages/UploadPage';

export const metadata: Metadata = {
  title: 'Import Audio từ YouTube | WaveLink',
  description: 'Dán link video YouTube để trích xuất và lưu vào danh sách audio phát ngầm của bạn.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function UploadRoutePage() {
  return <UploadPage />;
}
