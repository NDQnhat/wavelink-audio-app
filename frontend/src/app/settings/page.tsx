import React from 'react';
import type { Metadata } from 'next';
import { SettingsPage } from '@/pages/SettingsPage';

export const metadata: Metadata = {
  title: 'Cài Đặt Ứng Dụng | WaveLink',
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsRoutePage() {
  return <SettingsPage />;
}
