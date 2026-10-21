import React from 'react';
import type { Metadata } from 'next';
import { ProfilePage } from '@/pages/ProfilePage';

export const metadata: Metadata = {
  title: 'Hồ Sơ Tác Giả / Người Dùng | WaveLink',
  description: 'Trang thông tin tác giả và danh sách audio đã chia sẻ trên WaveLink.',
};

export default function ProfileUserRoutePage() {
  return <ProfilePage />;
}
