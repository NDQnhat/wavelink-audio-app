import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export const Footer: React.FC = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const pathname = location.pathname;

  const isAdmin = user?.role === 'ADMIN';

  const isHomeActive = pathname === '/' || pathname === '/home';
  const isLibraryActive = pathname.startsWith('/library');
  const isAdminActive = pathname.startsWith('/admin') || pathname === '/settings';
  const isCommunityActive = pathname === '/community';
  const isProfileActive = pathname === '/profile';

  return (
    <nav className="bottom-nav-comic pb-safe">
      <div className="relative flex justify-around items-center h-[62px] px-2">
        {/* Tab 1: Trang chủ */}
        <NavLink
          to="/home"
          className={`nav-tab-comic ${isHomeActive ? 'active' : ''}`}
        >
          <i className={isHomeActive ? 'ri-home-5-fill' : 'ri-home-5-line'} />
          <span>Trang chủ</span>
        </NavLink>

        {/* Tab 2: Thư viện */}
        <NavLink
          to="/library"
          className={`nav-tab-comic ${isLibraryActive ? 'active' : ''}`}
        >
          <i className={isLibraryActive ? 'ri-book-read-fill' : 'ri-book-read-line'} />
          <span>Thư viện</span>
        </NavLink>

        {/* Center Raised Comic FAB: Nhập link YouTube */}
        <div className="relative flex flex-col items-center justify-center flex-1">
          <button
            onClick={() => navigate('/upload')}
            aria-label="Nhập link YouTube"
            className="fab-comic"
            title="Nhập link YouTube"
          >
            <i className="ri-add-line font-black" />
          </button>
          <span className="text-[10px] font-black uppercase text-black tracking-tighter -mt-3">
            Nhập Link
          </span>
        </div>

        {/* Tab 4: Cộng đồng hoặc Quản lý (Admin) */}
        {isAdmin ? (
          <NavLink
            to="/admin"
            className={`nav-tab-comic ${isAdminActive ? 'active' : ''}`}
          >
            <i className={isAdminActive ? 'ri-dashboard-3-fill' : 'ri-dashboard-3-line'} />
            <span>Quản trị</span>
          </NavLink>
        ) : (
          <NavLink
            to="/community"
            className={`nav-tab-comic ${isCommunityActive ? 'active' : ''}`}
          >
            <i className={isCommunityActive ? 'ri-group-fill' : 'ri-group-line'} />
            <span>Cộng đồng</span>
          </NavLink>
        )}

        {/* Tab 5: Cá nhân */}
        <NavLink
          to="/profile"
          className={`nav-tab-comic ${isProfileActive ? 'active' : ''}`}
        >
          <i className={isProfileActive ? 'ri-user-3-fill' : 'ri-user-3-line'} />
          <span>Cá nhân</span>
        </NavLink>
      </div>
    </nav>
  );
});

