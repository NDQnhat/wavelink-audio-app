import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useMyMembership } from '@/hooks/useMembership';
import { AdminTabs } from '@/pages/admin/AdminTabs';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

const GOOGLE_CLIENT_ID = '1843465297-bbnnggqpe1s5r82gtvi2h0kli7fves7c.apps.googleusercontent.com';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string; select_by?: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              text?: string;
              shape?: string;
              width?: number | string;
            }
          ) => void;
        };
      };
    };
  }
}

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLive, logout, refreshUser } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { playbackRate, setPlaybackRate } = usePlayerStore();
  const { data: myMembership } = useMyMembership();

  // State modals
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [nameInput, setNameInput] = useState(user?.username || '');

  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [coverInput, setCoverInput] = useState(user?.coverUrl || '');

  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isCancelVipOpen, setIsCancelVipOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundOrderCode, setRefundOrderCode] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundBank, setRefundBank] = useState('');

  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState('Chung');
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintContent, setComplaintContent] = useState('');

  const [isClearCacheModalOpen, setIsClearCacheModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isVip = myMembership?.isVip || user?.role === 'VIP' || user?.role === 'ADMIN';

  // Preset anime/comic cover wallpapers
  const wallpaperPresets = [
    { name: 'Cyber City', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80' },
    { name: 'Manga Studio', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80' },
    { name: 'Neon Wave', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80' },
    { name: 'Galaxy Beats', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80' },
  ];

  const handleGoogleLinkClick = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (google?.accounts?.oauth2) {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (resp: { access_token?: string; error?: string }) => {
          if (resp.access_token) {
            try {
              toast.info('Đang liên kết tài khoản Google...');
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              if (res.ok) {
                const info = await res.json();
                await api.user.linkGoogle(
                  {
                    googleId: info.sub,
                    avatarUrl: info.picture,
                    email: info.email,
                  },
                  isLive
                );
                await refreshUser();
                toast.success('🎉 Đã liên kết tài khoản Google thành công!');
              }
            } catch (err: unknown) {
              toast.error((err as Error).message || 'Lỗi khi liên kết Google');
            }
          } else if (resp.error) {
            toast.error('Liên kết Google bị hủy: ' + resp.error);
          }
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    }
  };

  // Handlers
  const handleUpdateName = async () => {
    if (!nameInput.trim()) {
      toast.error('Tên không được để trống');
      return false;
    }
    try {
      await api.user.updateProfile({ username: nameInput.trim() }, undefined, isLive);
      await refreshUser();
      toast.success('Đã cập nhật tên tài khoản thành công!');
      setIsEditNameOpen(false);
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi đổi tên');
      return false;
    }
  };

  const handleUpdateCover = async (urlToSave?: string) => {
    const finalUrl = (urlToSave !== undefined ? urlToSave : coverInput).trim();
    try {
      await api.user.updateProfile({ coverUrl: finalUrl }, undefined, isLive);
      await refreshUser();
      toast.success(finalUrl ? 'Đã cài đặt hình nền tài khoản!' : 'Đã xóa hình nền tài khoản!');
      setIsCoverOpen(false);
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi lưu hình nền');
      return false;
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('Vui lòng nhập đầy đủ mật khẩu cũ và mới');
      return false;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp');
      return false;
    }
    try {
      await api.user.updatePassword(oldPassword, newPassword, isLive);
      toast.success('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordOpen(false);
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi đổi mật khẩu');
      return false;
    }
  };

  const handleCancelVip = async () => {
    try {
      await api.membership.cancelVip(cancelReason, isLive);
      await refreshUser();
      toast.success('Đã hủy gói VIP thành công.');
      setIsCancelVipOpen(false);
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi hủy gói VIP');
      return false;
    }
  };

  const handleRequestRefund = async () => {
    if (!refundReason.trim()) {
      toast.error('Vui lòng nhập lý do hoàn tiền');
      return false;
    }
    try {
      await api.membership.requestRefund(refundOrderCode.trim(), refundReason.trim(), refundBank.trim(), isLive);
      toast.success('Yêu cầu hoàn tiền đã được gửi! Ban quản trị sẽ xử lý trong 24h.');
      setRefundReason('');
      setRefundBank('');
      setIsRefundOpen(false);
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi gửi yêu cầu hoàn tiền');
      return false;
    }
  };

  const handleSubmitComplaint = async () => {
    if (!complaintSubject.trim() || !complaintContent.trim()) {
      toast.error('Vui lòng nhập tiêu đề và nội dung khiếu nại');
      return false;
    }
    try {
      await api.membership.submitComplaint(
        complaintSubject.trim(),
        complaintContent.trim(),
        complaintCategory,
        isLive
      );
      toast.success('Đã gửi khiếu nại thành công! WaveLink sẽ phản hồi qua thông báo.');
      setComplaintSubject('');
      setComplaintContent('');
      setIsComplaintOpen(false);
      return true;
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi gửi khiếu nại');
      return false;
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      toast.info('Đang quét và đồng bộ hàng đợi ngoại tuyến...');
      const count = await api.progress.syncOfflineQueue();
      toast.success(`Hàng đợi đã được đồng bộ hoàn toàn (${count} bản ghi)!`);
    } catch {
      toast.error('Lỗi khi đồng bộ hàng đợi ngoại tuyến');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = () => {
    localStorage.removeItem('audio_library_db');
    toast.success('Đã dọn dẹp cache! Đang tải lại...');
    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Đã đăng xuất khỏi WaveLink');
    navigate('/login');
  };

  return (
    <div className="flex flex-col w-full pb-36 fade-in-comic">
      {user?.role === 'ADMIN' && <AdminTabs activeTab="settings" />}

      <div className="px-4 flex flex-col gap-4 pt-1">
        {/* Banner Card */}
        <div className="card-comic p-4 bg-[#FFE600] flex flex-col gap-1 border-2 border-black relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-black font-black shadow-comic-sm">
              <i className="ri-settings-4-fill text-lg" />
            </div>
            <div>
              <h1 className="font-extrabold text-base uppercase tracking-tight text-black">
                Cài Đặt Hệ Thống & Tài Khoản
              </h1>
              <p className="text-[11px] font-bold text-gray-800">
                Tùy biến giao diện, bảo mật tài khoản, hình nền, gói VIP & hỗ trợ
              </p>
            </div>
          </div>
        </div>

        {/* 1. Giao diện sáng / tối */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-palette-fill text-base text-[#8338EC]" />
              <span className="font-extrabold text-xs uppercase text-black">Chế Độ Hiển Thị Giao Diện</span>
            </div>
            <span className="badge-comic badge-comic-yellow text-[9px] font-black uppercase">
              {theme === 'dark' ? 'Dark Ink' : 'Light Paper'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`btn-comic text-xs py-2.5 ${theme !== 'dark' ? 'btn-comic-yellow' : 'bg-white'}`}
            >
              <i className="ri-sun-fill text-base mr-1" /> Manga Giấy Trắng
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`btn-comic text-xs py-2.5 ${theme === 'dark' ? 'btn-comic-yellow' : 'bg-white'}`}
            >
              <i className="ri-moon-fill text-base mr-1" /> Mực Đen Dark Ink
            </button>
          </div>
        </div>

        {/* 2. Quản lý Hồ sơ & Tên hiển thị & Hình nền */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <i className="ri-user-settings-fill text-base text-[#3A86FF]" />
            <span className="font-extrabold text-xs uppercase text-black">Hồ Sơ & Hình Nền Tài Khoản</span>
          </div>

          {/* User info preview */}
          <div className="card-comic-sm p-3 bg-gray-50 flex items-center gap-3 relative overflow-hidden">
            {user?.coverUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: `url(${user.coverUrl})` }}
              />
            )}
            <div className="relative z-10 w-12 h-12 rounded-full border-2 border-black bg-[#FFE600] flex items-center justify-center font-black text-lg overflow-hidden shrink-0 shadow-comic-sm">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                (user?.username || 'U').substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="relative z-10 flex flex-col min-w-0 flex-1">
              <span className="font-black text-sm text-black truncate">{user?.username || 'Khách vãng lai'}</span>
              <span className="text-xs font-semibold text-gray-600 truncate">{user?.email || 'Chưa liên kết email'}</span>
              <span className="text-[10px] font-bold text-gray-500">
                Hình nền: {user?.coverUrl ? 'Đã cài đặt hình nền riêng' : 'Mặc định'}
              </span>
            </div>
          </div>

          {/* Quick actions for profile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setNameInput(user?.username || '');
                setIsEditNameOpen(true);
              }}
              className="btn-comic text-xs py-2 px-3 bg-gray-100 flex items-center justify-center gap-1.5"
            >
              <i className="ri-edit-2-line font-bold" /> Đổi Tên Hiển Thị
            </button>
            <button
              onClick={() => {
                setCoverInput(user?.coverUrl || '');
                setIsCoverOpen(true);
              }}
              className="btn-comic text-xs py-2 px-3 bg-[#FFE600] text-black flex items-center justify-center gap-1.5"
            >
              <i className="ri-image-add-line font-bold" /> Đổi Hình Nền
            </button>
          </div>

          <button
            onClick={() => setIsPasswordOpen(true)}
            className="btn-comic text-xs py-2 px-3 bg-white border-2 border-black flex items-center justify-center gap-1.5"
          >
            <i className="ri-lock-password-line font-bold" /> Đổi Mật Khẩu Đăng Nhập
          </button>
        </div>

        {/* 3. Liên kết tài khoản Google */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-google-fill text-base text-[#EA4335]" />
              <span className="font-extrabold text-xs uppercase text-black">Liên Kết Google Account</span>
            </div>
            <span
              className={`badge-comic ${
                user?.googleId ? 'badge-comic-teal' : 'badge-comic-orange'
              } text-[9px] font-black`}
            >
              {user?.googleId ? 'ĐÃ LIÊN KẾT' : 'CHƯA LIÊN KẾT'}
            </span>
          </div>

          {user?.googleId ? (
            <div className="card-comic-sm p-3 bg-teal-50 border-teal-300 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-teal-500 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Google Avatar" className="w-full h-full object-cover" />
                ) : (
                  <i className="ri-google-fill text-teal-600 font-bold" />
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-xs text-teal-900 truncate">
                  Tài khoản Google đã kết nối an toàn
                </span>
                <span className="text-[11px] font-mono font-semibold text-teal-700 truncate">
                  ID: {user.googleId.substring(0, 14)}...
                </span>
              </div>
              <i className="ri-checkbox-circle-fill text-lg text-[#2A9D8F]" />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-600">
                Liên kết tài khoản Google để đăng nhập 1 chạm và tự động đồng bộ ảnh đại diện từ Google.
              </p>
              <button
                type="button"
                onClick={handleGoogleLinkClick}
                className="btn-comic bg-white hover:bg-gray-50 text-black text-xs py-2 px-3.5 font-extrabold shadow-comic flex items-center justify-center gap-2 border-2 border-black w-max mx-auto"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Liên Kết Với Google</span>
              </button>
            </div>
          )}
        </div>

        {/* 4. Gói VIP, Hủy VIP & Hoàn Tiền */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-vip-crown-fill text-base text-[#FFE600]" />
              <span className="font-extrabold text-xs uppercase text-black">Hội Viên VIP & Thanh Toán</span>
            </div>
            <span
              className={`badge-comic ${
                isVip ? 'badge-comic-purple' : 'badge-comic-white'
              } text-[9px] font-black`}
            >
              {isVip ? 'VIP ACTIVE' : 'FREE TIER'}
            </span>
          </div>

          <div className="card-comic-sm p-3 bg-purple-50 border-purple-300 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-black text-xs text-purple-950">
                Trạng thái: {isVip ? 'Đang kích hoạt gói VIP' : 'Tài khoản thường'}
              </span>
              <span className="text-[11px] font-semibold text-purple-800">
                {user?.vipExpiresAt
                  ? `Hạn dùng đến: ${new Date(user.vipExpiresAt).toLocaleDateString('vi-VN')}`
                  : 'Nâng cấp VIP để mở khóa truyện độc quyền & bỏ giới hạn'}
              </span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/membership')}
              className="text-xs py-1.5 px-3 shrink-0"
            >
              {isVip ? 'Xem Gói' : 'Nâng Cấp'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
            {isVip && (
              <button
                onClick={() => setIsCancelVipOpen(true)}
                className="btn-comic text-xs py-2 px-3 bg-[#FFF1F2] text-[#E63946] flex items-center justify-center gap-1.5"
              >
                <i className="ri-close-circle-line font-bold" /> Hủy Gói VIP
              </button>
            )}
            <button
              onClick={() => {
                setRefundOrderCode(myMembership?.latestOrder?.orderCode || '');
                setIsRefundOpen(true);
              }}
              className={`btn-comic text-xs py-2 px-3 bg-gray-100 flex items-center justify-center gap-1.5 ${
                !isVip ? 'col-span-2' : ''
              }`}
            >
              <i className="ri-refund-2-line font-bold" /> Yêu Cầu Hoàn Tiền
            </button>
          </div>
        </div>

        {/* 5. Cài đặt phát Audio mặc định */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-speed-line text-base text-[#2A9D8F]" />
              <span className="font-extrabold text-xs uppercase text-black">Tốc Độ Phát Mặc Định</span>
            </div>
            <span className="badge-comic badge-comic-teal text-[9px] font-black">
              HIỆN TẠI: {playbackRate}x
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-600">
            Tốc độ này sẽ tự động lưu và áp dụng cho toàn bộ các tập audio khi bạn phát.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[1, 1.25, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => setPlaybackRate(s, user?.id)}
                className={`btn-comic text-xs py-2 font-black ${
                  playbackRate === s ? 'btn-comic-yellow' : 'bg-gray-100'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* 6. Khiếu Nại & Góp Ý */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="ri-customer-service-2-fill text-base text-[#F4A261]" />
              <span className="font-extrabold text-xs uppercase text-black">Khiếu Nại & Hỗ Trợ Kỹ Thuật</span>
            </div>
            <span className="badge-comic badge-comic-white text-[9px]">24/7 SUPPORT</span>
          </div>
          <p className="text-xs font-semibold text-gray-600">
            Gặp vấn đề về bản quyền, nạp VIP, âm thanh hoặc trải nghiệm? Gửi ngay phản hồi cho ban quản trị.
          </p>
          <button
            onClick={() => setIsComplaintOpen(true)}
            className="btn-comic btn-comic-yellow text-xs py-2 px-3 flex items-center justify-center gap-1.5"
          >
            <i className="ri-feedback-line font-bold" /> Gửi Khiếu Nại / Yêu Cầu Hỗ Trợ
          </button>
        </div>

        {/* 7. Bộ nhớ đệm & Đăng xuất */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-xs uppercase text-black">Hệ Thống & Bộ Nhớ Tạm</span>
            <span className="badge-comic badge-comic-teal text-[9px]">ONLINE</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleForceSync}
              disabled={isSyncing}
              className="btn-comic text-xs py-2 px-3 bg-gray-100 flex items-center justify-center gap-1"
            >
              <i className={`ri-refresh-line ${isSyncing ? 'animate-spin' : ''}`} /> Đồng Bộ Ngay
            </button>
            <button
              onClick={() => setIsClearCacheModalOpen(true)}
              className="btn-comic text-xs py-2 px-3 bg-gray-100 flex items-center justify-center gap-1"
            >
              <i className="ri-delete-bin-line" /> Xóa Cache
            </button>
          </div>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="btn-comic btn-comic-red text-xs py-2.5 px-3 flex items-center justify-center gap-1.5 mt-1"
          >
            <i className="ri-logout-box-line font-bold" /> Đăng Xuất Khỏi Thiết Bị
          </button>
        </div>
      </div>

      {/* MODAL 1: Sửa Tên Tài Khoản */}
      <Modal
        isOpen={isEditNameOpen}
        onClose={() => setIsEditNameOpen(false)}
        title="ĐỔI TÊN HIỂN THỊ"
        confirmText="Lưu Tên"
        cancelText="Hủy"
        onConfirm={handleUpdateName}
      >
        <div className="flex flex-col gap-2.5 py-1">
          <label className="text-xs font-bold text-gray-700">Tên hiển thị mới:</label>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Nhập tên mới..."
            className="input-comic text-xs font-bold"
            maxLength={50}
          />
          <p className="text-[11px] font-semibold text-gray-500">
            Tên này sẽ hiển thị trên cộng đồng bình luận và trang cá nhân của bạn.
          </p>
        </div>
      </Modal>

      {/* MODAL 2: Cài Đặt Hình Nền */}
      <Modal
        isOpen={isCoverOpen}
        onClose={() => setIsCoverOpen(false)}
        title="HÌNH NỀN TÀI KHOẢN"
        confirmText="Áp Dụng"
        cancelText="Hủy"
        onConfirm={() => handleUpdateCover()}
      >
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-700">Link ảnh hình nền (URL):</label>
            <input
              type="url"
              value={coverInput}
              onChange={(e) => setCoverInput(e.target.value)}
              placeholder="https://example.com/wallpaper.jpg"
              className="input-comic text-xs font-mono font-bold"
            />
          </div>

          {/* Preset Wallpapers */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-gray-600">Hoặc chọn mẫu Manga/Anime có sẵn:</span>
            <div className="grid grid-cols-2 gap-2">
              {wallpaperPresets.map((preset) => (
                <div
                  key={preset.name}
                  onClick={() => setCoverInput(preset.url)}
                  className={`card-comic-sm p-1.5 flex flex-col gap-1 cursor-pointer hover:border-black ${
                    coverInput === preset.url ? 'border-2 border-black bg-yellow-100' : 'bg-gray-50'
                  }`}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-14 object-cover rounded" />
                  <span className="text-[10px] font-black truncate">{preset.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {coverInput && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold text-gray-600">Xem trước:</span>
              <div
                className="w-full h-20 rounded border-2 border-black bg-cover bg-center shadow-comic-sm"
                style={{ backgroundImage: `url(${coverInput})` }}
              />
            </div>
          )}

          {user?.coverUrl && (
            <button
              type="button"
              onClick={() => handleUpdateCover('')}
              className="btn-comic text-[11px] py-1.5 bg-[#FFF1F2] text-[#E63946] flex items-center justify-center gap-1"
            >
              <i className="ri-delete-bin-line" /> Xóa hình nền hiện tại
            </button>
          )}
        </div>
      </Modal>

      {/* MODAL 3: Đổi Mật Khẩu */}
      <Modal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
        title="ĐỔI MẬT KHẨU"
        confirmText="Xác Nhận"
        cancelText="Hủy"
        onConfirm={handleChangePassword}
      >
        <div className="flex flex-col gap-2.5 py-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Mật khẩu hiện tại:</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="input-comic text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Mật khẩu mới (tối thiểu 6 ký tự):</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="input-comic text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Xác nhận mật khẩu mới:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-comic text-xs"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 4: Hủy Gói VIP */}
      <Modal
        isOpen={isCancelVipOpen}
        onClose={() => setIsCancelVipOpen(false)}
        title="XÁC NHẬN HỦY GÓI VIP"
        isDanger
        confirmText="Hủy Gói VIP"
        cancelText="Giữ Gói VIP"
        onConfirm={handleCancelVip}
      >
        <div className="flex flex-col gap-2.5 py-1">
          <p className="text-xs font-bold text-red-600">
            Cảnh báo: Sau khi hủy, tài khoản của bạn sẽ mất các đặc quyền VIP (truyện VIP Only, không giới hạn YouTube).
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Lý do hủy (tùy chọn):</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cho chúng tôi biết lý do bạn muốn dừng gói..."
              className="input-comic text-xs h-16 resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 5: Yêu Cầu Hoàn Tiền */}
      <Modal
        isOpen={isRefundOpen}
        onClose={() => setIsRefundOpen(false)}
        title="YÊU CẦU HOÀN TIỀN VIP"
        confirmText="Gửi Yêu Cầu"
        cancelText="Đóng"
        onConfirm={handleRequestRefund}
      >
        <div className="flex flex-col gap-2.5 py-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Mã đơn hàng VIP (nếu có):</label>
            <input
              type="text"
              value={refundOrderCode}
              onChange={(e) => setRefundOrderCode(e.target.value)}
              placeholder="Ví dụ: VIP_172893..."
              className="input-comic text-xs font-mono font-bold"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Lý do hoàn tiền (*):</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Mô tả lý do bạn muốn hoàn tiền..."
              className="input-comic text-xs h-16 resize-none"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Thông tin ngân hàng nhận tiền:</label>
            <input
              type="text"
              value={refundBank}
              onChange={(e) => setRefundBank(e.target.value)}
              placeholder="Ngân hàng, STK, Tên chủ tài khoản..."
              className="input-comic text-xs font-bold"
            />
          </div>
          <p className="text-[11px] font-semibold text-gray-500">
            Chính sách: Hoàn tiền 100% trong vòng 7 ngày đầu nếu gặp lỗi kỹ thuật không khắc phục được.
          </p>
        </div>
      </Modal>

      {/* MODAL 6: Gửi Khiếu Nại & Hỗ Trợ */}
      <Modal
        isOpen={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        title="GỬI KHIẾU NẠI & GÓP Ý"
        confirmText="Gửi Đi"
        cancelText="Hủy"
        onConfirm={handleSubmitComplaint}
      >
        <div className="flex flex-col gap-2.5 py-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Chủ đề khiếu nại:</label>
            <select
              value={complaintCategory}
              onChange={(e) => setComplaintCategory(e.target.value)}
              className="input-comic text-xs font-bold bg-white"
            >
              <option value="Bản quyền truyện">Bản quyền nội dung / DMCA</option>
              <option value="Thanh toán & VIP">Sự cố nạp VIP / Đơn hàng</option>
              <option value="Chất lượng Audio">Lỗi âm thanh / Lỗi phát YouTube</option>
              <option value="Lỗi ứng dụng">Lỗi giao diện / Ứng dụng giật lag</option>
              <option value="Góp ý tính năng">Góp ý phát triển tính năng mới</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Tiêu đề ngắn gọn (*):</label>
            <input
              type="text"
              value={complaintSubject}
              onChange={(e) => setComplaintSubject(e.target.value)}
              placeholder="Tóm tắt vấn đề bạn gặp phải..."
              className="input-comic text-xs font-bold"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-700">Nội dung chi tiết (*):</label>
            <textarea
              value={complaintContent}
              onChange={(e) => setComplaintContent(e.target.value)}
              placeholder="Mô tả cụ thể thời điểm xảy ra lỗi, link truyện hoặc thông tin liên quan..."
              className="input-comic text-xs h-20 resize-none font-medium"
              required
            />
          </div>
        </div>
      </Modal>

      {/* MODAL 7: Xóa Cache */}
      <Modal
        isOpen={isClearCacheModalOpen}
        onClose={() => setIsClearCacheModalOpen(false)}
        title="XÓA BỘ NHỚ TẠM?"
        isDanger
        confirmText="Xác Nhận"
        onConfirm={handleClearCache}
      >
        <p className="text-xs font-semibold text-gray-800">
          Thao tác này sẽ xóa cache db.json cục bộ. Phiên đăng nhập sẽ được giữ nguyên.
        </p>
      </Modal>

      {/* MODAL 8: Đăng Xuất */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="ĐĂNG XUẤT TÀI KHOẢN?"
        isDanger
        confirmText="Đăng Xuất"
        cancelText="Ở Lại"
        onConfirm={handleLogout}
      >
        <p className="text-xs font-semibold text-gray-800">
          Bạn có chắc chắn muốn đăng xuất khỏi WaveLink? Tiến trình nghe của bạn đã được bảo toàn trên đám mây.
        </p>
      </Modal>
    </div>
  );
};
