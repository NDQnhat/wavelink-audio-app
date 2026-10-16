import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { LibraryPage } from '@/pages/LibraryPage';
import { PlayerPage } from '@/pages/PlayerPage';
import { UploadPage } from '@/pages/UploadPage';
import { CommunityPage } from '@/pages/CommunityPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { MembershipPage } from '@/pages/MembershipPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { AuthPage } from '@/pages/AuthPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AdminAudiosPage } from '@/pages/admin/AdminAudiosPage';
import { AdminEpisodesPage } from '@/pages/admin/AdminEpisodesPage';
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage';
import { AdminAccountsPage } from '@/pages/admin/AdminAccountsPage';
import { AdminVipPage } from '@/pages/admin/AdminVipPage';
import { AdminCommunityPage } from '@/pages/admin/AdminCommunityPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/:id" element={<ProfilePage />} />
        <Route path="/membership" element={<MembershipPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route path="/admin/audios" element={<AdminAudiosPage />} />
        <Route path="/admin/episodes" element={<AdminEpisodesPage />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage />} />
        <Route path="/admin/accounts" element={<AdminAccountsPage />} />
        <Route path="/admin/vip" element={<AdminVipPage />} />
        <Route path="/admin/community" element={<AdminCommunityPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  );
};
