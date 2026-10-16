import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudios, useUpdateAudio, useDeleteAudio } from '@/hooks/useAudio';
import { AudioItem } from '@/types';
import { AdminTabs } from './AdminTabs';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { LoadingState } from '@/components/common/LoadingState';
import { Pagination } from '@/components/ui/Pagination';
import { DEFAULT_PAGE_SIZE } from '@/config/pagination';

export const AdminAudiosPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: audios = [], isLoading } = useAudios();
  const updateAudioMutation = useUpdateAudio();
  const deleteAudioMutation = useDeleteAudio();

  const [editingAudio, setEditingAudio] = useState<AudioItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVip, setEditVip] = useState(false);

  const [deletingAudioId, setDeletingAudioId] = useState<number | null>(null);

  const filteredAudios = audios.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.author.toLowerCase().includes(search.toLowerCase()) ||
      a.youtubeVideoId.toLowerCase().includes(search.toLowerCase())
  );

  // Pagination (12 audios per page by default, configurable via env)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = DEFAULT_PAGE_SIZE;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredAudios.length / pageSize) || 1;
  const paginatedAudios = filteredAudios.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openEditModal = (a: AudioItem) => {
    setEditingAudio(a);
    setEditTitle(a.title);
    setEditAuthor(a.author || '');
    setEditDesc(a.description || '');
    setEditVip(Boolean(a.isVIPOnly || a.isVipOnly));
  };

  const handleSaveEdit = async () => {
    if (!editingAudio) return false;
    if (!editTitle.trim()) {
      toast.error('Tiêu đề không được để trống');
      return false;
    }
    try {
      toast.info('Đang cập nhật audio...');
      await updateAudioMutation.mutateAsync({
        id: editingAudio.id,
        data: {
          title: editTitle.trim(),
          author: editAuthor.trim(),
          description: editDesc.trim(),
          isVIPOnly: editVip,
          isVipOnly: editVip,
        },
      });
      toast.success('Cập nhật audio thành công!');
      setEditingAudio(null);
      return true;
    } catch {
      toast.error('Lỗi khi cập nhật audio');
      return false;
    }
  };

  const handleDeleteAudio = async () => {
    if (!deletingAudioId) return;
    try {
      toast.info('Đang xóa audio...');
      await deleteAudioMutation.mutateAsync(deletingAudioId);
      toast.success('Đã xóa audio thành công');
      setDeletingAudioId(null);
    } catch {
      toast.error('Lỗi khi xóa audio');
    }
  };

  return (
    <div className="flex flex-col w-full pb-36 fade-in-comic">
      <AdminTabs activeTab="audios" />

      <div className="px-4 flex flex-col gap-3">
        {/* Search & Counter Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-bold pointer-events-none z-10" />
            <input
              type="text"
              placeholder="Tìm theo tên truyện, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-comic pl-9 pr-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center border border-black bg-white text-black z-10"
                title="Xóa tìm kiếm"
              >
                <i className="ri-close-line text-xs font-bold" />
              </button>
            )}
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="btn-comic btn-comic-yellow text-xs py-2 px-3 shrink-0"
          >
            <i className="ri-add-line font-black" /> Thêm Audio
          </button>
        </div>

        {/* List Container */}
        {isLoading ? (
          <LoadingState message="Đang tải danh sách audio quản trị..." />
        ) : filteredAudios.length === 0 ? (
          <div className="card-comic p-6 text-center text-xs font-bold text-gray-600 bg-white">
            Không tìm thấy audio nào phù hợp.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
            {paginatedAudios.map((a) => (
              <div key={a.id} className="card-comic p-3 flex flex-col gap-2 bg-white">
                <div className="flex items-start gap-3">
                  <img
                    src={a.thumbnailUrl}
                    alt={a.title}
                    className="w-16 h-20 rounded-lg border-2 border-black object-cover shrink-0 bg-black shadow-comic-sm"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="badge-comic badge-comic-blue text-[9px] py-0 px-1 font-bold">
                          {a.categoryName || 'Chung'}
                        </span>
                        {Boolean(a.isVIPOnly || a.isVipOnly) && (
                          <span className="badge-comic badge-comic-purple text-[8px] py-0 px-1 font-black">
                            <i className="ri-vip-crown-fill" /> VIP
                          </span>
                        )}
                      </div>
                      <span
                        className={`badge-comic ${
                          a.status === 'ACTIVE' || !a.status ? 'badge-comic-teal' : 'badge-comic-white'
                        } text-[8px] py-0 px-1`}
                      >
                        {a.status === 'ACTIVE' || !a.status ? 'ACTIVE' : 'HIDDEN'}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-xs text-black truncate mt-1">{a.title}</h3>
                    <p className="text-[11px] font-semibold text-gray-500 truncate mt-0.5">
                      Tác giả: {a.author || 'Chưa rõ'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono font-bold text-gray-700">
                      <span className="badge-comic badge-comic-yellow text-[8px] py-0 px-1">
                        {a.totalEpisodes || a.episodes?.length || 1} Tập
                      </span>
                      <span className="badge-comic badge-comic-white text-[8px] py-0 px-1">
                        {a.formattedDuration || '24h 00m'}
                      </span>
                      <span className="text-gray-400">ID: {a.youtubeVideoId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-black mt-1">
                  <span className="text-xs font-bold text-gray-700">
                    Tiến độ: <strong className="text-[#3A86FF]">{a.progressPercent || 0}%</strong>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => navigate(`/player/${a.id}`)}
                      className="btn-comic text-[11px] py-1 px-2 bg-white"
                    >
                      <i className="ri-play-fill text-sm" /> Nghe
                    </button>
                    <button
                      onClick={() => navigate(`/admin/episodes?audioId=${a.id}`)}
                      className="btn-comic text-[11px] py-1 px-2 bg-white"
                    >
                      <i className="ri-scissors-cut-line text-sm" /> Tập
                    </button>
                    <button
                      onClick={() => openEditModal(a)}
                      className="btn-comic text-[11px] py-1 px-2 bg-gray-100"
                    >
                      <i className="ri-edit-line text-sm" /> Sửa
                    </button>
                    <button
                      onClick={() => setDeletingAudioId(a.id)}
                      className="btn-comic btn-comic-red text-[11px] py-1 px-2"
                      title="Xóa"
                    >
                      <i className="ri-delete-bin-line text-sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredAudios.length}
              pageSize={pageSize}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}
      </div>

      {/* Edit Audio Modal */}
      <Modal
        isOpen={Boolean(editingAudio)}
        onClose={() => setEditingAudio(null)}
        title="SỬA THÔNG TIN AUDIO"
        confirmText="Lưu Thay Đổi"
        onConfirm={handleSaveEdit}
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="font-extrabold text-[11px] uppercase text-black">Tiêu đề truyện</label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="input-comic text-xs py-1.5"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="font-extrabold text-[11px] uppercase text-black">Tác giả</label>
            <input
              type="text"
              value={editAuthor}
              onChange={(e) => setEditAuthor(e.target.value)}
              className="input-comic text-xs py-1.5"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="font-extrabold text-[11px] uppercase text-black">Mô tả tóm tắt</label>
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="input-comic text-xs h-16 py-1.5 resize-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              id="edit-audio-vip-box"
              type="checkbox"
              checked={editVip}
              onChange={(e) => setEditVip(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded accent-[#8338EC] cursor-pointer"
            />
            <label htmlFor="edit-audio-vip-box" className="text-xs font-bold text-black cursor-pointer">
              Độc quyền cho thành viên VIP
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Audio Modal */}
      <Modal
        isOpen={Boolean(deletingAudioId)}
        onClose={() => setDeletingAudioId(null)}
        title="XÓA AUDIO NÀY?"
        isDanger
        confirmText="Xóa Vĩnh Viễn"
        onConfirm={handleDeleteAudio}
      >
        <div className="flex flex-col gap-1.5 text-xs font-semibold text-gray-800">
          <p>Bạn có chắc chắn muốn xóa bộ audio này khỏi cơ sở dữ liệu?</p>
          <p className="text-red-600 font-bold">
            ⚠️ Toàn bộ các tập logic và tiến trình nghe liên quan cũng sẽ bị xóa!
          </p>
        </div>
      </Modal>
    </div>
  );
};

