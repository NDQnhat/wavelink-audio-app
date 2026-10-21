import React from 'react';
import type { Metadata } from 'next';
import { MembershipPage } from '@/pages/MembershipPage';

export const metadata: Metadata = {
  title: 'Nâng Cấp Gói VIP | WaveLink Audio',
  description: 'Mở khóa import không giới hạn audio từ YouTube, truy cập kho nội dung độc quyền và trải nghiệm nghe không quảng cáo.',
};

export default function MembershipRoutePage() {
  return <MembershipPage />;
}
