import React from 'react';
import type { Metadata } from 'next';
import { LibraryPage } from '@/pages/LibraryPage';

export const metadata: Metadata = {
  title: 'Thư Viện Audio | WaveLink',
  description: 'Tìm kiếm, lọc và phân loại hàng ngàn audio, podcast từ YouTube theo thể loại, từ khóa, tác giả.',
};

export default function LibraryRoutePage() {
  return <LibraryPage />;
}
