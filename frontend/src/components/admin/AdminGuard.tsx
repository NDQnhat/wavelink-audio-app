import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { AdminOverviewSkeleton } from '@/components/common/Skeletons';

export const AdminGuard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isInitialized } = useAuthStore();

  const isAuthLoading =
    isLoading ||
    (!isInitialized &&
      !user &&
      Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('auth_token')));

  const isDenied = !isAuthLoading && user?.role !== 'ADMIN';

  useEffect(() => {
    if (isDenied) {
      toast.error('Permission Denied: Không thể truy cập! Khu vực này chỉ dành riêng cho Quản trị viên (ADMIN).');
    }
  }, [isDenied]);

  if (isAuthLoading) {
    return <AdminOverviewSkeleton />;
  }

  if (isDenied) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center p-4 min-h-[65vh] fade-in-comic">
        <div className="card-comic p-6 sm:p-8 max-w-md w-full text-center bg-white border-2 border-black flex flex-col items-center gap-4 shadow-[4px_4px_0_#000]">
          <div className="w-16 h-16 rounded-full border-2 border-black bg-[#E63946] text-white flex items-center justify-center shadow-[2px_2px_0_#000] animate-bounce">
            <i className="ri-shield-cross-fill text-3xl font-black" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="badge-comic badge-comic-red text-[11px] mx-auto uppercase tracking-wider font-extrabold px-3 py-0.5">
              Permission Denied
            </span>
            <h2 className="font-black text-xl uppercase text-black mt-1">
              Không thể truy cập
            </h2>
            <p className="text-xs font-semibold text-gray-700 leading-relaxed">
              Bạn không có quyền quản trị viên (ADMIN) để truy cập vào trang này. Toàn bộ tính năng quản trị đã bị khóa bảo vệ.
            </p>
          </div>

          <div className="p-3 bg-gray-50 border border-black rounded-lg w-full text-left text-xs font-mono text-gray-700 flex flex-col gap-1.5 shadow-[2px_2px_0_#000]">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Tài khoản:</span>
              <span className="truncate max-w-[180px] font-semibold">{user?.username || 'Chưa đăng nhập / Khách'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Vai trò hiện tại:</span>
              <span className="badge-comic badge-comic-yellow text-[10px] px-2 py-0 font-bold">
                {user?.role || 'GUEST'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-900">Quyền yêu cầu:</span>
              <span className="badge-comic badge-comic-teal text-[10px] px-2 py-0 font-bold">
                ADMIN
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full mt-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1 font-bold"
              onClick={() => navigate(-1)}
            >
              <i className="ri-arrow-left-line mr-1" /> Quay lại
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 font-bold"
              onClick={() => navigate('/home')}
            >
              <i className="ri-home-4-line mr-1" /> Về Trang Chủ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
