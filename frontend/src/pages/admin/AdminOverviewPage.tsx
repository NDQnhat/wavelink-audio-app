import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useStats } from '@/hooks/useStats';
import { useCategories } from '@/hooks/useCategories';
import { AdminTabs } from './AdminTabs';
import { Button } from '@/components/ui/Button';

export const AdminOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: stats } = useStats();
  const { data: categories = [] } = useCategories();

  if (user?.role !== 'ADMIN') {
    return (
      <div className="card-comic p-8 m-4 text-center bg-white flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-black bg-[#E63946] text-white flex items-center justify-center shadow-comic">
          <i className="ri-forbid-2-line text-2xl font-black" />
        </div>
        <h3 className="font-extrabold text-sm uppercase text-black">Quyền Truy Cập Bị Từ Chối</h3>
        <p className="text-xs font-semibold text-gray-600">
          Trang này chỉ dành riêng cho Quản trị viên hệ thống (Role: ADMIN).
        </p>
        <Button variant="primary" size="sm" onClick={() => navigate('/home')}>
          Về Trang Chủ
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-36 fade-in-comic">
      <AdminTabs activeTab="overview" />

      <div className="px-4 flex flex-col gap-4">
        {/* 2. Management Header */}
        <section className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="badge-comic badge-comic-teal text-[10px]">
              <i className="ri-checkbox-circle-fill" /> HỆ THỐNG GOLANG PRODUCTION
            </span>
            <span className="badge-comic badge-comic-white text-[10px] font-mono">
              v3.0.0 PROD
            </span>
          </div>

          <div className="card-comic p-4 bg-[#FFE600] flex items-center justify-between border-2 border-black">
            <div className="flex flex-col">
              <h1 className="font-extrabold text-lg uppercase tracking-tight text-black">
                Trung Tâm Quản Trị
              </h1>
              <p className="text-xs font-bold text-gray-800">
                Giám sát tổng thể kho audio, phân tập logic và người dùng
              </p>
            </div>
            <button
              onClick={() => navigate('/upload')}
              className="btn-comic btn-comic-primary text-xs py-2 px-3 shrink-0"
            >
              <i className="ri-add-line font-bold" /> Thêm Audio
            </button>
          </div>
        </section>

        {/* 3. Navigation Hub Cards */}
        <section className="grid grid-cols-2 gap-3">
          {/* Card 1: Quản lý danh sách Audio */}
          <div
            onClick={() => navigate('/admin/audios')}
            className="card-comic p-3.5 bg-white flex flex-col justify-between cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-comic-md transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Kho Audio</span>
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#3A86FF] text-white flex items-center justify-center shadow-comic-sm">
                <i className="ri-book-read-fill text-base" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="font-extrabold text-2xl text-black leading-none">{stats?.totalAudios || 0}</span>
              <span className="badge-comic badge-comic-yellow text-[8px] py-0 px-1 font-bold">BẢN GHI</span>
            </div>
            <div className="flex items-center justify-between text-xs font-extrabold text-[#3A86FF] pt-2 border-t-2 border-black mt-2">
              <span>Vào quản lý</span>
              <i className="ri-arrow-right-line" />
            </div>
          </div>

          {/* Card 2: Quản lý Phân Đoạn Tập */}
          <div
            onClick={() => navigate('/admin/episodes')}
            className="card-comic p-3.5 bg-white flex flex-col justify-between cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-comic-md transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Phân Tập Logic</span>
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#2A9D8F] text-white flex items-center justify-center shadow-comic-sm">
                <i className="ri-scissors-cut-line text-base font-bold" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="font-extrabold text-2xl text-black leading-none">{stats?.totalEpisodes || 0}</span>
              <span className="badge-comic badge-comic-teal text-[8px] py-0 px-1 font-bold">TẬP</span>
            </div>
            <div className="flex items-center justify-between text-xs font-extrabold text-[#2A9D8F] pt-2 border-t-2 border-black mt-2">
              <span>Xem phân đoạn</span>
              <i className="ri-arrow-right-line" />
            </div>
          </div>

          {/* Card 3: Thể loại & Thẻ */}
          <div
            onClick={() => navigate('/admin/categories')}
            className="card-comic p-3.5 bg-white flex flex-col justify-between cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-comic-md transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Thể Loại & Thẻ</span>
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#F4A261] text-black flex items-center justify-center shadow-comic-sm">
                <i className="ri-price-tag-3-fill text-base" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="font-extrabold text-2xl text-black leading-none">{categories.length}</span>
              <span className="badge-comic badge-comic-orange text-[8px] py-0 px-1 font-bold">DANH MỤC</span>
            </div>
            <div className="flex items-center justify-between text-xs font-extrabold text-[#F4A261] pt-2 border-t-2 border-black mt-2">
              <span>Xem danh mục</span>
              <i className="ri-arrow-right-line" />
            </div>
          </div>

          {/* Card 4: Quản lý Tài khoản & Phân quyền */}
          <div
            onClick={() => navigate('/admin/accounts')}
            className="card-comic p-3.5 bg-white flex flex-col justify-between cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-comic-md transition-all active:translate-x-0.5 active:translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-gray-500">Tài Khoản</span>
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#8338EC] text-white flex items-center justify-center shadow-comic-sm">
                <i className="ri-group-fill text-base" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 my-1">
              <span className="font-extrabold text-2xl text-black leading-none">RBAC</span>
              <span className="badge-comic badge-comic-purple text-[8px] py-0 px-1 font-bold">4 CẤP</span>
            </div>
            <div className="flex items-center justify-between text-xs font-extrabold text-[#8338EC] pt-2 border-t-2 border-black mt-2">
              <span>Phân quyền</span>
              <i className="ri-arrow-right-line" />
            </div>
          </div>
        </section>

        {/* Card 5: Cài đặt hệ thống */}
        <div
          onClick={() => navigate('/settings')}
          className="card-comic p-3.5 bg-white flex items-center justify-between cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-comic-md transition-all active:translate-x-0.5 active:translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg border-2 border-black bg-gray-100 flex items-center justify-center text-black shadow-comic-sm">
              <i className="ri-settings-4-line text-xl font-bold" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xs uppercase text-black">
                Cài Đặt Hệ Thống & Bộ Nhớ Cache
              </span>
              <span className="text-[11px] font-semibold text-gray-600">
                SQLite WAL, Offline Queue & Audio Embed Quality
              </span>
            </div>
          </div>
          <i className="ri-arrow-right-s-line text-xl font-bold text-black" />
        </div>
      </div>
    </div>
  );
};

