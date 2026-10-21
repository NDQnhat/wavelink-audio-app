'use client';

import React from 'react';
import { NavLink } from 'react-router-dom';

export interface AdminTabsProps {
  activeTab: 'overview' | 'audios' | 'episodes' | 'categories' | 'accounts' | 'vip' | 'community' | 'settings';
}

export const AdminTabs: React.FC<AdminTabsProps> = ({ activeTab }) => {
  return (
    <div className="w-full bg-white border-b-2 border-black shadow-comic-sm mb-3">
      <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar">
        <NavLink
          to="/admin"
          end
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'overview' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-dashboard-line" /> Tổng quan
        </NavLink>
        <NavLink
          to="/admin/audios"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'audios' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-book-read-line" /> Kho Audio
        </NavLink>
        <NavLink
          to="/admin/episodes"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'episodes' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-scissors-cut-line" /> Phân Tập
        </NavLink>
        <NavLink
          to="/admin/categories"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'categories' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-price-tag-3-line" /> Thể loại & Thẻ
        </NavLink>
        <NavLink
          to="/admin/accounts"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'accounts' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-group-line" /> Tài khoản
        </NavLink>
        <NavLink
          to="/admin/vip"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'vip' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-vip-crown-fill text-[#8338EC]" /> Gói VIP & VietQR
        </NavLink>
        <NavLink
          to="/admin/community"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'community' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-community-line text-[#3A86FF]" /> Quản Lý Cộng Đồng
        </NavLink>
        <NavLink
          to="/settings"
          className={`btn-comic text-[11px] py-1 px-2.5 whitespace-nowrap ${
            activeTab === 'settings' ? 'btn-comic-yellow' : 'bg-white'
          }`}
        >
          <i className="ri-settings-4-line" /> Cài đặt
        </NavLink>
      </div>
    </div>
  );
};
