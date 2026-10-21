import React from 'react';
import type { Metadata } from 'next';
import { HomePage } from '@/pages/HomePage';

export const metadata: Metadata = {
  title: 'Trang Chủ | WaveLink Audio',
  description: 'Khám phá kho audio, podcast, talkshow tổng hợp từ video YouTube phong phú trên WaveLink.',
};

export default function HomeRoutePage() {
  return <HomePage />;
}
