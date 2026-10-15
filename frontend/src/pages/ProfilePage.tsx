import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useRecentHistory } from '@/hooks/useHistory';
import { useAudios } from '@/hooks/useAudio';
import { usePlayerStore } from '@/stores/playerStore';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { Pagination } from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';
import { api } from '@/services/api';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLive, logout, refreshUser } = useAuthStore();
  const { play } = usePlayerStore();

  const { data: history = [] } = useRecentHistory();
  const { data: myAudios = [] } = useAudios({ status: 'my' });

  // Pagination (12 items per page by default, configurable via env)
  const pageSize = DEFAULT_PAGE_SIZE;
  const [historyPage, setHistoryPage] = useState(1);
  const totalHistoryPages = Math.ceil(history.length / pageSize) || 1;
  const paginatedHistory = history.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  const [myAudiosPage, setMyAudiosPage] = useState(1);
  const totalMyAudiosPages = Math.ceil(myAudios.length / pageSize) || 1;
  const paginatedMyAudios = myAudios.slice((myAudiosPage - 1) * pageSize, myAudiosPage * pageSize);

  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const isVipOrAdmin = user?.role === 'VIP' || user?.role === 'ADMIN';

  let vipCountdown = '';
  if (user?.role === 'VIP' && user?.vipExpiresAt) {
    const exp = new Date(user.vipExpiresAt);
    const diff = exp.getTime() - Date.now();
    if (diff > 0) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      vipCountdown = `(Còn ${days} ngày ${hours} giờ)`;
    } else {
      vipCountdown = '(Đã hết hạn)';
    }
  }

  const handleUpdateName = async () => {
    if (!newUsername.trim()) {
      toast.error('Tên không được để trống');
      return false;
    }
    try {
      await api.user.updateProfile(newUsername.trim(), user?.email, isLive);
      await refreshUser();
      toast.success('Đã đổi tên thành công!');
      return true;
    } catch {
      toast.error('Lỗi cập nhật tên');
      return false;
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      toast.error('Vui lòng nhập đầy đủ mật khẩu');
      return false;
    }
    try {
      await api.user.updatePassword(oldPassword, newPassword, isLive);
      toast.success('Đổi mật khẩu thành công!');
      return true;
    } catch {
      toast.error('Lỗi đổi mật khẩu');
      return false;
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Đã đăng xuất');
    navigate('/login');
  };

  const handleResumeHistory = async (audioId: number, pos: number, episodeId?: number, episodeNumber?: number) => {
    const targetAudio = await api.audio.getAudioById(audioId, isLive);
    if (targetAudio) {
      const targetEp =
        targetAudio.episodes?.find(
          (e) => (episodeId && e.id === episodeId) || (episodeNumber && e.episodeNumber === episodeNumber)
        ) ||
        targetAudio.episodes?.find((e) => e.id === targetAudio.currentEpisodeId || e.episodeNumber === targetAudio.currentEpisodeNumber) ||
        targetAudio.episodes?.[0];
      play(targetAudio, targetEp, pos);
      navigate(`/player/${audioId}`);
    }
  };

  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* 1. Profile Comic Card */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3 relative overflow-hidden">
        {user?.coverUrl && (
          <div
            className="absolute inset-x-0 top-0 h-20 bg-cover bg-center border-b-2 border-black"
            style={{ backgroundImage: `url(${user.coverUrl})` }}
          >
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}
        <div className={`flex items-center gap-3 relative z-10 ${user?.coverUrl ? 'pt-10' : ''}`}>
          {/* Avatar */}
          <div
            className={`relative w-16 h-16 rounded-full border-3 border-black ${
              user?.role === 'ADMIN'
                ? 'bg-[#E63946] text-white'
                : user?.role === 'VIP'
                ? 'bg-[#8338EC] text-white'
                : 'bg-[#FFE600] text-black'
            } flex items-center justify-center font-black text-2xl shadow-comic-sm shrink-0 overflow-hidden`}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              (user?.username || 'K').substring(0, 2).toUpperCase()
            )}
            {isVipOrAdmin && (
              <span className="absolute -top-1 -right-1 text-base text-[#FFE600]">
                <i className="ri-vip-crown-fill" />
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-black truncate leading-tight">
                {user?.username || 'Khách'}
              </h2>
              <span
                className={`badge-comic ${
                  user?.role === 'ADMIN'
                    ? 'badge-comic-red'
                    : user?.role === 'VIP'
                    ? 'badge-comic-purple'
                    : 'badge-comic-yellow'
                } text-[9px] font-black`}
              >
                {user?.role || 'GUEST'}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-500 truncate mt-0.5">
              {user?.email || (user?.isGuest ? 'Khách vãng lai' : 'Chưa có email')}
            </span>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className={`badge-comic ${
                  user?.role === 'VIP' ? 'badge-comic-purple' : 'badge-comic-white'
                } text-[9px] py-0.5 px-1.5 font-bold flex items-center gap-1`}
              >
                {user?.role === 'VIP' && <i className="ri-vip-crown-fill text-[#FFE600]" />}
                Hội viên: <strong>{user?.role === 'VIP' ? 'VIP' : user?.role === 'ADMIN' ? 'ADMIN' : 'FREE'}</strong>{' '}
                {vipCountdown}
              </span>
            </div>
          </div>
        </div>

        {/* Quota Progress Bar */}
        <div className="card-comic-sm p-2.5 bg-[#FEF9C3] flex flex-col gap-1 border border-black mt-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-black">
            <span>Hạn mức Import YouTube hôm nay:</span>
            <span>{isVipOrAdmin ? 'Không giới hạn' : 'Đã dùng 0/5'}</span>
          </div>
          <div className="w-full bg-white h-2 rounded-full border border-black overflow-hidden shadow-comic-sm">
            <div className="h-full bg-[#3A86FF]" style={{ width: isVipOrAdmin ? '100%' : '20%' }} />
          </div>
        </div>

        {/* Quick Action Buttons Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black">
          <button
            onClick={() => {
              setNewUsername(user?.username || '');
              setIsEditNameOpen(true);
            }}
            className="btn-comic text-xs py-1.5 bg-gray-100"
          >
            <i className="ri-edit-line" /> Sửa Tên
          </button>
          <button
            onClick={() => {
              setOldPassword('');
              setNewPassword('');
              setIsChangePasswordOpen(true);
            }}
            className="btn-comic text-xs py-1.5 bg-gray-100"
          >
            <i className="ri-lock-password-line" /> Đổi Mật Khẩu
          </button>
        </div>
      </div>

      {/* 2. Guest Upgrade Banner if Guest */}
      {user?.isGuest && (
        <div className="card-comic p-4 bg-[#FFE600] flex flex-col gap-2 border-2 border-black">
          <div className="flex items-center gap-2">
            <i className="ri-user-star-fill text-xl text-black" />
            <span className="font-extrabold text-xs uppercase text-black">Nâng Cấp Tài Khoản Chính Thức</span>
          </div>
          <p className="text-xs font-bold text-gray-800">
            Đăng ký tài khoản để giữ lại toàn bộ lịch sử nghe và tiến trình khi đổi thiết bị!
          </p>
          <button onClick={() => navigate('/login')} className="btn-comic btn-comic-primary text-xs py-2">
            Đăng Ký / Đăng Nhập Ngay
          </button>
        </div>
      )}

      {/* 3. VIP Banner if not VIP */}
      {!isVipOrAdmin && (
        <div
          onClick={() => navigate('/membership')}
          className="card-comic p-3.5 bg-[#8338EC] text-white flex items-center justify-between cursor-pointer shadow-comic-md"
        >
          <div className="flex items-center gap-2.5">
            <i className="ri-vip-crown-fill text-2xl text-[#FFE600]" />
            <div className="flex flex-col">
              <span className="font-extrabold text-xs uppercase text-white">Nâng Cấp Gói VIP</span>
              <span className="text-[11px] font-semibold text-white/90">
                Mở khóa truyện độc quyền & Không giới hạn import
              </span>
            </div>
          </div>
          <i className="ri-arrow-right-s-line text-xl font-bold" />
        </div>
      )}

      

      {/* 4. Lịch Sử Cày Truyện Cá Nhân */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
          <span className="font-extrabold text-xs uppercase text-black">Nhật Ký Cày Truyện Của Bạn</span>
          <span className="badge-comic badge-comic-yellow text-[9px] font-black">{history.length} BỘ TRUYỆN</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {history.length === 0 ? (
            <span className="text-xs font-semibold text-gray-500 py-3 text-center">Chưa có nhật ký nghe nào</span>
          ) : (
            <>
              {paginatedHistory.map((item) => {
                const progress = item.progressPercent || 0;
                const title = item.title || 'Truyện Audio';
                const epTitle = item.currentEpisodeTitle || 'Tập 1';
                const pos = item.formattedPosition || '00:00:00';

                return (
                  <div
                    key={`${item.audioId}-${item.episodeId}`}
                    className="card-comic-sm p-3 flex flex-col gap-2 hover:bg-gray-50 transition-all border-2 border-black"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={item.thumbnailUrl || 'https://img.youtube.com/vi/placeholder/hqdefault.jpg'}
                          alt={title}
                          className="w-12 h-14 rounded border border-black object-cover shrink-0 bg-black"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-extrabold text-xs text-black truncate leading-tight">{title}</span>
                          <span className="text-[11px] font-semibold text-gray-600 truncate mt-0.5">
                            {epTitle} • Mốc: <strong>{pos}</strong>
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            Đã nghe: {Math.round((item.totalDurationListened || 60) / 60)} phút
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleResumeHistory(
                            item.audioId,
                            item.lastPositionSeconds || 0,
                            item.currentEpisodeId,
                            item.currentEpisodeNumber
                          )
                        }
                        className="btn-comic btn-comic-primary text-[10px] py-1.5 px-3 shrink-0 flex items-center gap-1"
                      >
                        <i className="ri-play-fill font-bold" /> Nghe tiếp
                      </button>
                    </div>
                    <div className="w-full bg-gray-200 h-1.5 rounded-full border border-black overflow-hidden">
                      <div className="h-full bg-[#3A86FF]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                );
              })}

              <Pagination
                currentPage={historyPage}
                totalPages={totalHistoryPages}
                totalItems={history.length}
                pageSize={pageSize}
                onPageChange={(p) => setHistoryPage(p)}
              />
            </>
          )}
        </div>
      </div>

      {/* 5. Truyện Do Tôi Nhập */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
          <span className="font-extrabold text-xs uppercase text-black">Truyện Do Bạn Nhập</span>
          <span className="badge-comic badge-comic-teal text-[9px] font-black">{myAudios.length} BỘ</span>
        </div>

        <div className="flex flex-col gap-2">
          {myAudios.length === 0 ? (
            <span className="text-xs font-semibold text-gray-500 py-3 text-center">
              Bạn chưa nhập video YouTube nào
            </span>
          ) : (
            <>
              {paginatedMyAudios.map((audio) => (
                <div
                  key={audio.id}
                  className="card-comic-sm p-2.5 flex items-center justify-between gap-2.5 hover:bg-gray-50 transition-all border border-black"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={audio.thumbnailUrl}
                      alt={audio.title}
                      className="w-10 h-12 rounded border border-black object-cover shrink-0 bg-black"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-extrabold text-xs text-black truncate leading-tight">{audio.title}</span>
                      <span className="text-[10px] font-semibold text-gray-500">
                        {audio.totalEpisodes || audio.episodes?.length || 1} Tập • {audio.formattedDuration || '24h 00m'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/player/${audio.id}`)}
                    className="btn-comic text-[10px] py-1 px-2.5 bg-gray-100 shrink-0"
                  >
                    <i className="ri-play-fill" /> Xem
                  </button>
                </div>
              ))}

              <Pagination
                currentPage={myAudiosPage}
                totalPages={totalMyAudiosPages}
                totalItems={myAudios.length}
                pageSize={pageSize}
                onPageChange={(p) => setMyAudiosPage(p)}
              />
            </>
          )}
        </div>
      </div>

      {/* 6. Logout Button */}
      <button
        onClick={() => setIsLogoutModalOpen(true)}
        className="btn-comic btn-comic-red text-xs py-3 font-black shadow-comic mt-2"
      >
        <i className="ri-logout-box-line text-base font-bold" /> Đăng Xuất Tài Khoản
      </button>

      {/* Edit Name Modal */}
      <Modal
        isOpen={isEditNameOpen}
        onClose={() => setIsEditNameOpen(false)}
        title="ĐỔI TÊN ĐỘC GIẢ"
        confirmText="Lưu Tên"
        onConfirm={handleUpdateName}
      >
        <div className="flex flex-col gap-1.5">
          <label className="font-extrabold text-[11px] uppercase text-black">Tên người dùng mới</label>
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="input-comic text-xs py-1.5"
          />
        </div>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        title="ĐỔI MẬT KHẨU"
        confirmText="Đổi Mật Khẩu"
        onConfirm={handleChangePassword}
      >
        <div className="flex flex-col gap-1.5">
          <label className="font-extrabold text-[11px] uppercase text-black">Mật khẩu hiện tại</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="input-comic text-xs py-1.5"
            placeholder="••••••••"
          />
          <label className="font-extrabold text-[11px] uppercase text-black mt-0.5">Mật khẩu mới</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-comic text-xs py-1.5"
            placeholder="••••••••"
          />
        </div>
      </Modal>

      {/* Logout Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="ĐĂNG XUẤT?"
        confirmText="Đăng Xuất"
        isDanger
        onConfirm={handleLogout}
      >
        <p className="text-xs font-semibold text-gray-800 leading-snug">Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?</p>
      </Modal>
    </div>
  );
};

