import React from 'react';
import type { Metadata } from 'next';
import { CommunityPage } from '@/pages/CommunityPage';

export const metadata: Metadata = {
  title: 'Cộng Đồng Thính Giả | WaveLink',
  description: 'Thảo luận, chia sẻ cảm nghĩ về các audio, podcast và bảng xếp hạng thính giả tích cực tại WaveLink.',
};

export default function CommunityRoutePage() {
  return <CommunityPage />;
}
