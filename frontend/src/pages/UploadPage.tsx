import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { useImportYouTube } from '@/hooks/useAudio';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { api } from '@/services/api';
import { YouTubePreviewData, AudioItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { extractYouTubeId, formatTime, formatDuration, parseDurationToSec, computeLogicalEpisodes } from '@/lib/utils';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLive } = useAuthStore();
  const { data: categories = [] } = useCategories();
  const importMutation = useImportYouTube();

  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tags, setTags] = useState<string[]>(['Audiobook', 'TuTiên', 'TrọnBộ']);
  const [newTag, setNewTag] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [blockSize, setBlockSize] = useState<number>(14400);
  const [isVipOnly, setIsVipOnly] = useState(false);

  const [isChecking, setIsChecking] = useState(false);
  const [previewData, setPreviewData] = useState<YouTubePreviewData | null>(null);

  const [duplicateModalAudio, setDuplicateModalAudio] = useState<AudioItem | null>(null);
  const [successModalAudio, setSuccessModalAudio] = useState<AudioItem | null>(null);

  const isVipOrAdmin = user?.role === 'ADMIN' || user?.role === 'VIP';
  const userRole = user?.role || 'GUEST';

  const checkDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const checkURL = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    const videoId = extractYouTubeId(trimmed);
    if (!videoId) return;

    setIsChecking(true);
    try {
      const data = await api.audio.previewYouTube(trimmed, isLive);
      if (data) {
        setPreviewData(data);
        if (data.formattedDuration) {
          setDurationInput(data.formattedDuration);
        } else if (data.durationSeconds > 0) {
          setDurationInput(formatDuration(data.durationSeconds));
        }
      }
    } catch {
      // Ignored
    } finally {
      setIsChecking(false);
    }
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    if (val.includes('youtube.com/') || val.includes('youtu.be/')) {
      checkDebounceRef.current = setTimeout(() => {
        checkURL(val);
      }, 400);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
        checkURL(text);
      }
    } catch {
      toast.error('Không đọc được bộ nhớ tạm, vui lòng dán thủ công');
    }
  };

  const handleAddTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const calculatedTotalSec = parseDurationToSec(durationInput, previewData?.durationSeconds || 0);
  const computedEpisodes = computeLogicalEpisodes(calculatedTotalSec, blockSize);
  const calculatedEpisodeCount = computedEpisodes.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Vui lòng nhập liên kết YouTube');
      return;
    }

    let dur = parseDurationToSec(durationInput, previewData?.durationSeconds || 0);
    // Nếu durationInput trống hoặc xấp xỉ duration của YouTube previewData (lệch < 60s), ưu tiên thời lượng chính xác từ YouTube
    if (previewData && previewData.durationSeconds > 0) {
      if (dur <= 0 || Math.abs(dur - previewData.durationSeconds) < 60) {
        dur = previewData.durationSeconds;
      }
    }

    try {
      toast.info('Đang nhập và phân chia tập logic...');
      const result = await importMutation.mutateAsync({
        url: url.trim(),
        categoryId,
        tags,
        blockSizeSeconds: blockSize,
        durationSeconds: dur,
        isVipOnly,
      });

      if (result.duplicate) {
        setDuplicateModalAudio(result.audio);
      } else {
        // Đặt mặc định tốc độ phát là 1.0x khi nhập link mới về
        usePlayerStore.getState().setPlaybackRate(1.0);
        setSuccessModalAudio(result.audio);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi nhập audio');
    }
  };

  return (
    <div className="flex flex-col w-full px-4 pb-36 gap-4 pt-2 fade-in-comic">
      {/* 1. Header Banner */}
      <div className="card-comic p-4 bg-[#FFE600] flex flex-col gap-1 border-2 border-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-white flex items-center justify-center text-black font-black shadow-comic-sm">
              <i className="ri-youtube-fill text-xl text-[#E63946]" />
            </div>
            <h2 className="font-extrabold text-base uppercase text-black tracking-tight">Nhập Nguồn YouTube</h2>
          </div>
          <span className="badge-comic badge-comic-white text-[9px] font-black">100% POLICY COMPLIANT</span>
        </div>
        <p className="text-xs font-bold text-gray-800 mt-1">
          Hệ thống máy phát ảo MP3: Không tải tệp về server, trực tiếp phát luồng từ Google CDN.
        </p>
      </div>

      {/* 2. Quota Status Card */}
      <div className="card-comic-sm p-3 bg-white flex items-center justify-between border-2 border-black shadow-comic-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-black bg-gray-100 flex items-center justify-center font-bold text-black">
            <i className="ri-dashboard-3-line text-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase text-gray-500">Hạn mức của bạn ({userRole})</span>
            <span className="text-xs font-bold text-black">
              {isVipOrAdmin ? '⚡ Không giới hạn lượt import' : '⚠️ Miễn phí: 5 video / ngày'}
            </span>
          </div>
        </div>
        {!isVipOrAdmin ? (
          <button
            onClick={() => navigate('/membership')}
            className="btn-comic btn-comic-purple text-[10px] py-1 px-2.5"
          >
            <i className="ri-vip-crown-fill" /> Lên VIP
          </button>
        ) : (
          <span className="badge-comic badge-comic-teal text-[9px]">UNLIMITED</span>
        )}
      </div>

      {/* 3. Form Nhập Nguồn */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {/* URL Input Card */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <label className="font-extrabold text-xs uppercase text-black flex items-center justify-between" htmlFor="yt-url-input">
            <span>
              YouTube URL (Video, Shorts, Music...) <span className="text-[#E63946]">*</span>
            </span>
          </label>
          <div className="flex flex-col gap-2">
            <div className="relative w-full">
              <i className="ri-link absolute left-3 top-1/2 -translate-y-1/2 text-gray-700 text-base pointer-events-none font-bold z-10" />
              <input
                id="yt-url-input"
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="input-comic pl-9 pr-9 text-xs font-mono font-bold w-full"
                required
              />
              {url && (
                <button
                  type="button"
                  onClick={() => handleUrlChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center border border-black bg-white hover:bg-gray-100 active:scale-95 z-10 text-black"
                  title="Xóa URL"
                >
                  <i className="ri-close-line text-xs font-bold" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="btn-comic text-xs py-1.5 px-3 bg-gray-100 flex items-center gap-1.5 shrink-0"
                title="Dán từ Clipboard"
              >
                <i className="ri-clipboard-line text-sm" /> Dán
              </button>
              <button
                type="button"
                onClick={() => checkURL(url)}
                disabled={isChecking || !url.trim()}
                className="btn-comic btn-comic-yellow text-xs py-1.5 px-3.5 flex items-center gap-1.5 shrink-0"
                title="Kiểm tra link YouTube"
              >
                {isChecking ? <i className="ri-loader-4-line animate-spin text-sm" /> : <i className="ri-search-eye-line text-sm" />}
                Kiểm tra
              </button>
            </div>
          </div>

          {/* Live Preview Box */}
          {previewData && (
            <div className="card-comic-sm p-3 bg-[#FEF9C3] flex items-center gap-3 border-2 border-black fade-in-comic">
              <img
                src={previewData.thumbnailUrl}
                alt={previewData.title}
                className="w-16 h-20 rounded border border-black object-cover bg-black shrink-0 shadow-comic-sm"
              />
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-extrabold text-xs text-black line-clamp-2 leading-tight">
                  {previewData.title}
                </span>
                <span className="text-[11px] font-semibold text-gray-600 truncate mt-1">
                  Kênh: {previewData.author}
                </span>
                <span className="badge-comic badge-comic-teal text-[9px] mt-1.5 w-max">
                  <i className="ri-check-line" /> Hợp lệ (Ready)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Duration & Block Size Card */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-xs uppercase text-black" htmlFor="yt-duration-input">
                Thời Lượng Video (Tự động nhận diện từ YouTube)
              </label>
              <span className="text-[10px] font-bold text-gray-500">
                {previewData?.formattedDuration ? (
                  <span className="badge-comic badge-comic-teal text-[9px]">
                    <i className="ri-check-line" /> {previewData.formattedDuration}
                  </span>
                ) : (
                  'Tự động nhận diện'
                )}
              </span>
            </div>
            <input
              id="yt-duration-input"
              type="text"
              placeholder="Tự động nhận diện khi nhập URL (hoặc để trống)..."
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              className="input-comic text-xs font-mono font-bold"
            />
            <span className="text-[10px] font-semibold text-gray-500">
              Hệ thống tự động phát hiện thời lượng video thực tế để phân tập logic. Bạn có thể để trống hoặc chỉnh sửa nếu muốn.
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <label className="font-extrabold text-xs uppercase text-black" htmlFor="block-size-select">
              Khối Phân Tách Tập (Block Size)
            </label>
            <select
              id="block-size-select"
              value={blockSize}
              onChange={(e) => setBlockSize(parseInt(e.target.value, 10))}
              className="input-comic text-xs font-bold"
            >
              <option value={14400}>4 Giờ / Tập (Khuyên dùng cho truyện dài)</option>
              <option value={7200}>2 Giờ / Tập</option>
              <option value={3600}>1 Giờ / Tập</option>
              <option value={1800}>30 Phút / Tập</option>
            </select>
          </div>

          {/* Dynamic Episodes Calculation Badge & List */}
          <div className="card-comic-sm p-3 bg-[#FEF9C3] flex flex-col gap-2 border-2 border-black mt-2">
            <div className="flex items-center justify-between text-xs font-bold text-black border-b border-black/20 pb-1.5">
              <span className="flex items-center gap-1.5">
                <i className="ri-function-line text-sm text-[#3A86FF]" />
                Công Thức Phân Tập Động:
              </span>
              <span className="badge-comic badge-comic-red text-[10px]">
                {calculatedEpisodeCount > 0
                  ? `${calculatedEpisodeCount} tập (Tổng: ${formatDuration(calculatedTotalSec)})`
                  : `Tự động phân tập (${Math.round(blockSize / 3600)}h/tập)`}
              </span>
            </div>
            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto no-scrollbar text-[11px] font-mono">
              {computedEpisodes.length > 0 ? (
                computedEpisodes.map((ep) => (
                  <div key={ep.episodeNumber} className="flex items-center justify-between p-1.5 bg-white rounded border border-black/40">
                    <span className="font-bold text-black">
                      Tập {ep.episodeNumber}: {ep.formattedRange}
                    </span>
                    <span className="text-gray-600 text-[10px] font-sans font-semibold">{ep.formattedHours}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-500 italic">
                  Hệ thống sẽ tự động bóc tách thời lượng và phân tập từ YouTube ({Math.round(blockSize / 3600)}h/tập) khi bạn xác nhận...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Category & Tags Card */}
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="font-extrabold text-xs uppercase text-black" htmlFor="category-select">
              Thể Loại Truyện
            </label>
            <select
              id="category-select"
              value={categoryId}
              onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
              className="input-comic text-xs font-bold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <label className="font-extrabold text-xs uppercase text-black">Thẻ Tag (Phân loại)</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="badge-comic badge-comic-yellow text-[10px] py-1 px-2 flex items-center gap-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="font-black hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <input
                type="text"
                placeholder="Thêm tag mới..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="input-comic text-xs py-1 px-2.5 flex-1"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="btn-comic text-xs py-1 px-3 bg-gray-100"
              >
                + Thêm
              </button>
            </div>
          </div>

          {/* VIP Only Checkbox */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <input
              id="vip-only-checkbox"
              type="checkbox"
              checked={isVipOnly}
              onChange={(e) => setIsVipOnly(e.target.checked)}
              className="w-4 h-4 border-2 border-black rounded accent-[#8338EC] cursor-pointer"
            />
            <label htmlFor="vip-only-checkbox" className="text-xs font-bold text-black cursor-pointer flex items-center gap-1.5">
              <span>Độc quyền dành riêng cho thành viên VIP</span>
              <span className="badge-comic badge-comic-purple text-[8px] py-0 px-1">
                <i className="ri-vip-crown-fill" /> VIP
              </span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="submit-import-btn"
          type="submit"
          disabled={importMutation.isPending}
          className="btn-comic btn-comic-primary text-sm py-3 px-4 font-black shadow-comic-md mt-1"
        >
          {importMutation.isPending ? (
            <>
              <i className="ri-loader-4-line animate-spin text-lg" />
              <span>Đang xử lý phân tập...</span>
            </>
          ) : (
            <>
              <i className="ri-check-double-line text-lg" />
              <span>Xác Nhận & Phân Tập Tự Động</span>
            </>
          )}
        </button>
      </form>

      {/* Duplicate Video Modal */}
      <Modal
        isOpen={Boolean(duplicateModalAudio)}
        onClose={() => setDuplicateModalAudio(null)}
        title="TRUYỆN ĐÃ CÓ TRONG THƯ VIỆN"
        confirmText="Nghe Ngay"
        cancelText="Về Thư Viện"
        onConfirm={() => {
          if (duplicateModalAudio) navigate(`/player/${duplicateModalAudio.id}`);
        }}
      >
        <div className="flex flex-col items-center text-center gap-2 py-1">
          <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FFE600] text-black flex items-center justify-center shadow-comic-sm">
            <i className="ri-information-line text-xl font-black" />
          </div>
          <h4 className="font-extrabold text-xs sm:text-sm text-black uppercase leading-tight line-clamp-2">{duplicateModalAudio?.title}</h4>
          <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-snug">
            Video này đã có trên hệ thống với <strong>{duplicateModalAudio?.totalEpisodes || duplicateModalAudio?.episodes?.length || 1} tập logic</strong> ({duplicateModalAudio?.formattedDuration || 'chuẩn'}). Bạn không cần phân tập lại!
          </p>
        </div>
      </Modal>

      {/* Success Import Modal */}
      <Modal
        isOpen={Boolean(successModalAudio)}
        onClose={() => setSuccessModalAudio(null)}
        title="⚡ NHẬP THÀNH CÔNG!"
        confirmText="Phát Ngay"
        cancelText="Về Thư Viện"
        onConfirm={() => {
          if (successModalAudio) navigate(`/player/${successModalAudio.id}`);
        }}
      >
        <div className="flex flex-col items-center text-center gap-2 py-1">
          <div className="w-10 h-10 rounded-full border-2 border-black bg-[#2A9D8F] text-white flex items-center justify-center shadow-comic-sm">
            <i className="ri-check-line text-xl font-black" />
          </div>
          <h4 className="font-extrabold text-xs sm:text-sm text-black uppercase leading-tight line-clamp-2">{successModalAudio?.title}</h4>
          <p className="text-[11px] sm:text-xs font-semibold text-gray-700 leading-snug">
            Đã tự động cắt thành <strong>{successModalAudio?.totalEpisodes || successModalAudio?.episodes?.length || 1} tập logic</strong> chuẩn 100% YouTube ToS.
          </p>
        </div>
      </Modal>
    </div>
  );
};

