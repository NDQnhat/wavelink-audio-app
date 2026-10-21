import React from 'react';
import type { Metadata } from 'next';
import { AuthPage } from '@/pages/AuthPage';

export const metadata: Metadata = {
  title: 'Đăng Nhập | WaveLink',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginRoutePage() {
  return <AuthPage />;
}
