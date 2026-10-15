import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/hooks/useNotifications';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { LoadingState } from '@/components/common/LoadingState';
import { Pagination } from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  // Pagination (12 notifications per page by default, configurable via env)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const totalPages = Math.ceil(notifications.length / pageSize) || 1;
  const paginatedNotifications = notifications.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();
  const { data: preferences } = useNotificationPreferences();
  const updatePrefsMutation = useUpdateNotificationPreferences();

  const [isPrefsModalOpen, setIsPrefsModalOpen] = useState(false);
  const [prefEpisodes, setPrefEpisodes] = useState(true);
  const [prefMembership, setPrefMembership] = useState(true);
  const [prefSystem, setPrefSystem] = useState(true);

  const openPrefsModal = () => {
    if (preferences) {
      setPrefEpisodes(preferences.notifyNewEpisodes);
      setPrefMembership(preferences.notifyMembership);
      setPrefSystem(preferences.notifySystem);
    }
    setIsPrefsModalOpen(true);
  };

  const handleSavePreferences = async () => {
    try {
      await updatePrefsMutation.mutateAsync({
        notifyNewEpisodes: prefEpisodes,
        notifyMembership: prefMembership,
        notifySystem: prefSystem,
      });
      toast.success('Đã lưu tùy chọn thông báo!');
      setIsPrefsModalOpen(false);
    } catch {
      toast.error('Lỗi cập nhật tùy chọn');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
      toast.success('Đã đánh dấu toàn bộ thông báo là đã đọc!');
    } catch {
      toast.error('Lỗi thao tác');
    }
  };

  const handleNotificationClick = async (id: number | string, link?: string) => {
    await markReadMutation.mutateAsync(id);
    if (link) {
      if (link.startsWith('#/')) {
        navigate(link.substring(1));
      } else {
        navigate(link);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'MEMBERSHIP':
        return <i className="ri-vip-crown-fill text-lg text-[#8338EC]" />;
      case 'NEW_EPISODE':
        return <i className="ri-headphone-fill text-lg text-[#3A86FF]" />;
      case 'VIP_EXPIRED':
        return <i className="ri-alert-fill text-lg text-[#E63946]" />;
      default:
        return <i className="ri-notification-3-fill text-lg text-[#FFE600]" />;
    }
  };

  if (isLoading) {
    return <LoadingState message="Đang tải thông báo..." />;
  }

  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* Notification Header Card */}
      <div className="card-comic p-4 bg-[#FFE600] flex flex-col gap-1 border-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-black font-black shadow-comic-sm">
              <i className="ri-notification-3-line text-lg" />
            </div>
            <h1 className="font-extrabold text-base uppercase text-black tracking-tight">Hộp Thư Thông Báo</h1>
          </div>
          <span className="badge-comic badge-comic-red text-[9px] font-black">
            {unreadCount} CHƯA ĐỌC
          </span>
        </div>
        <p className="text-xs font-bold text-gray-800 mt-1">Cập nhật tin tức hội viên, tập truyện mới và hệ thống máy chủ</p>
      </div>

      {/* Quick Actions Row */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleMarkAllRead}
          className="btn-comic text-xs py-1.5 px-3 bg-white flex items-center gap-1"
        >
          <i className="ri-check-double-line font-bold" /> Đọc tất cả
        </button>
        <button
          onClick={openPrefsModal}
          className="btn-comic text-xs py-1.5 px-3 bg-white flex items-center gap-1"
        >
          <i className="ri-settings-3-line font-bold" /> Cài đặt nhận tin
        </button>
      </div>

      {/* Notifications List Container */}
      <div className="flex flex-col gap-2.5">
        {notifications.length === 0 ? (
          <div className="card-comic p-6 text-center flex flex-col items-center gap-2 bg-white">
            <i className="ri-mail-open-line text-3xl text-gray-400" />
            <h3 className="font-extrabold text-sm uppercase text-black">Chưa có thông báo nào</h3>
            <p className="text-xs font-semibold text-gray-500">
              Các cập nhật quan trọng về đơn hàng VIP và tập truyện sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <>
            {paginatedNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n.id, n.link)}
                className={`card-comic-sm p-3 flex items-start gap-3 border-2 border-black cursor-pointer transition-all ${
                  !n.isRead ? 'bg-[#FEF9C3] shadow-comic' : 'bg-white opacity-80'
                }`}
              >
                <div className="w-9 h-9 rounded-lg border border-black bg-white flex items-center justify-center shrink-0 shadow-comic-sm">
                  {getNotificationIcon(n.type)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-xs text-black truncate leading-tight">{n.title}</span>
                    {!n.isRead && (
                      <span className="badge-comic badge-comic-red text-[8px] py-0 px-1 font-black">MỚI</span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-gray-700 mt-1 leading-snug">{n.message}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1.5">
                    <span>{new Date(n.createdAt).toLocaleDateString('vi-VN')}</span>
                    {n.link && <span className="text-[#3A86FF] font-bold">Xem chi tiết →</span>}
                  </div>
                </div>
              </div>
            ))}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={notifications.length}
              pageSize={pageSize}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>

      {/* Notification Preferences Modal */}
      <Modal
        isOpen={isPrefsModalOpen}
        onClose={() => setIsPrefsModalOpen(false)}
        title="TÙY CHỌN NHẬN THÔNG BÁO"
        confirmText="Lưu Tùy Chọn"
        onConfirm={handleSavePreferences}
      >
        <div className="flex flex-col gap-2 text-[11px]">
          <p className="text-gray-700 font-semibold">Chọn loại thông báo bạn muốn nhận:</p>
          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-black">
            <div>
              <strong className="text-black font-bold">Tập truyện mới</strong>
              <p className="text-[10px] text-gray-500">Nhận tin khi truyện có tập mới</p>
            </div>
            <input
              type="checkbox"
              checked={prefEpisodes}
              onChange={(e) => setPrefEpisodes(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded accent-[#3A86FF] cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-black">
            <div>
              <strong className="text-black font-bold">Hội viên & Đơn hàng VIP</strong>
              <p className="text-[10px] text-gray-500">Gia hạn và thanh toán</p>
            </div>
            <input
              type="checkbox"
              checked={prefMembership}
              onChange={(e) => setPrefMembership(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded accent-[#8338EC] cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between p-1.5 bg-gray-50 rounded border border-black">
            <div>
              <strong className="text-black font-bold">Hệ thống & Sự kiện</strong>
              <p className="text-[10px] text-gray-500">Bảo trì và cập nhật</p>
            </div>
            <input
              type="checkbox"
              checked={prefSystem}
              onChange={(e) => setPrefSystem(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded accent-[#FFE600] cursor-pointer"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

