'use client';

import React from 'react';
import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminAudiosPage } from '@/pages/admin/AdminAudiosPage';
import { AdminEpisodesPage } from '@/pages/admin/AdminEpisodesPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminAccountsPage } from '@/pages/admin/AdminAccountsPage';
import { AdminVipPage } from '@/pages/admin/AdminVipPage';
import { AdminCommunityPage } from '@/pages/admin/AdminCommunityPage';

interface AdminClientWrapperProps {
  slug?: string[];
}

export function AdminClientWrapper({ slug = [] }: AdminClientWrapperProps) {
  const subPath = slug[0] || 'overview';

  let pageContent: React.ReactNode = <AdminOverviewPage />;

  switch (subPath) {
    case 'audios':
      pageContent = <AdminAudiosPage />;
      break;
    case 'episodes':
      pageContent = <AdminEpisodesPage />;
      break;
    case 'categories':
      pageContent = <AdminCategoriesPage />;
      break;
    case 'accounts':
      pageContent = <AdminAccountsPage />;
      break;
    case 'vip':
      pageContent = <AdminVipPage />;
      break;
    case 'community':
      pageContent = <AdminCommunityPage />;
      break;
    case 'overview':
    default:
      pageContent = <AdminOverviewPage />;
      break;
  }

  return <AdminGuard>{pageContent}</AdminGuard>;
}
