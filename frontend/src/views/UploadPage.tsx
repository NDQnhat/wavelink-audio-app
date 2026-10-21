'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { useImportYouTube, useImportQuota } from '@/hooks/useAudio';
import { triggerNotificationSync } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { usePlayerStore } from '@/stores/playerStore';
import { api } from '@/services/api';
import { YouTubePreviewData, AudioItem } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { extractYouTubeId, formatTime, formatDuration, parseDurationToSec, computeLogicalEpisodes } from '@/lib/utils';
import { resolveYouTubeDurationViaIframe } from '@/lib/youtubeResolver';
import { UploadSkeleton } from '@/components/common/Skeletons';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLive, isLoading, isInitialized } = useAuthStore();
  const { data: categories = [] } = useCategories();
  const importMutation = useImportYouTube();
  const { data: importQuota } = useImportQuota();

  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [tags, setTags] = useState<string[]>(['Audiobook', 'TuTiên', 'TrọnBộ']);
  const [newTag, setNewTag] = useState('');
  const [durationInput, setDurationInput] = useState('');
  const [blockSize, setBlockSize] = useState<number>(14400);
  const [isVipOnly, setIsVipOnly] = useState(false);
  const [freeEpisodesCount, setFreeEpisodesCount] = useState<number>(1);

  const [isChecking, setIsChecking] = useState(false);
  const [previewData, setPreviewData] = useState<YouTubePreviewData | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

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

  const autoScanMetadata = (title: string, description?: string) => {
    const text = `${title} ${description || ''}`.toLowerCase();

    // 1. Quét và tự động chọn thể loại phù hợp nhất
    if (categories.length > 0) {
      let matchedCategory = categories.find((c) => text.includes(c.name.toLowerCase()));
      if (!matchedCategory) {
        if (text.includes('tiên hiệp') || text.includes('tu tiên') || text.includes('tu chân') || text.includes('huyền huyễn')) {
          matchedCategory = categories.find((c) => c.slug.includes('tien-hiep') || c.name.toLowerCase().includes('tiên hiệp'));
        } else if (text.includes('kiếm hiệp') || text.includes('võ hiệp') || text.includes('kim dung')) {
          matchedCategory = categories.find((c) => c.slug.includes('kiem-hiep') || c.name.toLowerCase().includes('kiếm hiệp'));
        } else if (text.includes('kinh dị') || text.includes('truyện ma') || text.includes('nguyễn ngọc ngạn') || text.includes('rùng rợn')) {
          matchedCategory = categories.find((c) => c.slug.includes('kinh-di') || c.name.toLowerCase().includes('kinh dị'));
        } else if (text.includes('ngôn tình') || text.includes('tình cảm') || text.includes('lãng mạn') || text.includes('sủng')) {
          matchedCategory = categories.find((c) => c.slug.includes('ngon-tinh') || c.name.toLowerCase().includes('ngôn tình'));
        } else if (text.includes('trinh thám') || text.includes('vụ án') || text.includes('thám tử')) {
          matchedCategory = categories.find((c) => c.slug.includes('trinh-tham') || c.name.toLowerCase().includes('trinh thám'));
        } else if (text.includes('sách nói') || text.includes('audiobook') || text.includes('kỹ năng') || text.includes('tâm lý')) {
          matchedCategory = categories.find((c) => c.slug.includes('audiobook') || c.name.toLowerCase().includes('sách') || c.slug.includes('sach-noi'));
        }
      }
      if (matchedCategory) {
        setCategoryId(matchedCategory.id);
      }
    }

    // 2. Quét và tự động gắn thẻ tags liên quan
    const KEYWORD_TAGS = [
      'Tiên Hiệp', 'Tu Tiên', 'Kiếm Hiệp', 'Kinh Dị', 'Truyện Ma',
      'Ngôn Tình', 'Audiobook', 'Sách Nói', 'Trinh Thám', 'Huyền Huyễn',
      'Đô Thị', 'Trọng Sinh', 'Xuyên Không', 'Hài Hước', 'Tổng Tài',
      'Truyện Ngắn', 'Trọn Bộ', 'Full'
    ];
    const detectedTags: string[] = [];
    for (const kw of KEYWORD_TAGS) {
      if (text.includes(kw.toLowerCase())) {
        detectedTags.push(kw);
      }
    }
    if (detectedTags.length > 0) {
      setTags((prev) => Array.from(new Set([...prev, ...detectedTags])));
      toast.info(`Hệ thống đã tự động nhận diện và gắn thẻ: ${detectedTags.slice(0, 3).join(', ')}`);
    }
  };

  const checkURL = async (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      setPreviewData(null);
      setUrlError(null);
      return;
    }
    const videoId = extractYouTubeId(trimmed);
    if (!videoId) {
      setUrlError('Liên kết YouTube không đúng định dạng');
      setPreviewData(null);
      return;
    }

    setIsChecking(true);
    setUrlError(null);
    try {
      const data = await api.audio.previewYouTube(trimmed, isLive);
      if (data && data.title) {
        setPreviewData(data);
        autoScanMetadata(data.title, data.description);
        if (data.formattedDuration && data.durationSeconds > 0) {
          setDurationInput(data.formattedDuration);
        } else if (data.durationSeconds > 0) {
          setDurationInput(formatDuration(data.durationSeconds));
        } else {
          // Fallback probe client-side nếu backend chưa có thời lượng
          const resolvedDur = await resolveYouTubeDurationViaIframe(videoId);
          if (resolvedDur === -1) {
            setUrlError('Video YouTube không tồn tại, ở chế độ riêng tư hoặc không thể phát');
            setPreviewData(null);
            setDurationInput('');
            return;
          } else if (resolvedDur > 0) {
            setPreviewData({
              ...data,
              durationSeconds: resolvedDur,
              formattedDuration: formatDuration(resolvedDur),
            });
            setDurationInput(formatDuration(resolvedDur));
          }
        }
      } else {
        throw new Error('Video YouTube không tồn tại hoặc bị lỗi phát');
      }
    } catch (err: unknown) {
      // Backend hoặc oEmbed từ chối video (link rác)
      const probeDur = await resolveYouTubeDurationViaIframe(videoId);
      if (probeDur > 0) {
        setPreviewData({
          videoId,
          title: 'Audio YouTube - ' + videoId,
          author: 'YouTube Creator',
          durationSeconds: probeDur,
          formattedDuration: formatDuration(probeDur),
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        });
        setDurationInput(formatDuration(probeDur));
        setUrlError(null);
      } else {
        const msg = (err as Error)?.message || 'Video YouTube không tồn tại hoặc không thể phát!';
        setUrlError(msg);
        setPreviewData(null);
        setDurationInput('');
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleUrlChange = (val: string) => {
    setUrl(val);
    setUrlError(null);
    if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
    if (val.includes('youtube.com/') || val.includes('youtu.be/')) {
      checkDebounceRef.current = setTimeout(() => {
        checkURL(val);
      }, 400);
    } else if (!val.trim()) {
      setPreviewData(null);
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

  const isQuotaExceeded = !isVipOrAdmin && !user?.isGuest && Boolean(importQuota && importQuota.canImport === false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.isGuest) {
      toast.error('Khách vãng lai chưa thể nhập link. Vui lòng đăng nhập hoặc tạo tài khoản!');
      navigate('/login');
      return;
    }
    if (isQuotaExceeded) {
      toast.error('Bạn đã dùng hết hạn mức 5 lượt import hôm nay. Vui lòng nâng cấp VIP để tiếp tục không giới hạn!');
      navigate('/membership');
      return;
    }
    if (!url.trim()) {
      toast.error('Vui lòng nhập liên kết YouTube');
      return;
    }
    if (urlError) {
      toast.error(urlError);
      return;
    }
    if (!previewData) {
      toast.error('Video YouTube không hợp lệ hoặc không tồn tại! Vui lòng kiểm tra lại liên kết.');
      return;
    }

    let dur = parseDurationToSec(durationInput, previewData?.durationSeconds || 0);
    // Nếu durationInput trống hoặc xấp xỉ duration của YouTube previewData (lệch < 60s), ưu tiên thời lượng chính xác từ YouTube
    if (previewData && previewData.durationSeconds > 0) {
      if (dur <= 0 || Math.abs(dur - previewData.durationSeconds) < 60) {
        dur = previewData.durationSeconds;
      }
    }
    // Nếu dur vẫn <= 0, thử probe nhanh thời lượng qua IFrame client-side
    if (dur <= 0) {
      const vid = extractYouTubeId(url.trim());
      if (vid) {
        try {
          dur = await resolveYouTubeDurationViaIframe(vid);
        } catch {}
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
        freeEpisodesCount: isVipOnly ? freeEpisodesCount : 1,
      });

      if (result.duplicate) {
        setDuplicateModalAudio(result.audio);
      } else {
        setSuccessModalAudio(result.audio);
        triggerNotificationSync(true);
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Lỗi khi nhập audio');
    }
  };

  const isAuthLoading =
    isLoading ||
    (!isInitialized &&
      !user &&
      Boolean(typeof localStorage !== 'undefined' && localStorage.getItem('auth_token')));

  if (isAuthLoading) {
    return <UploadSkeleton />;
  }

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
            <span className="text-[10px] font-extrabold uppercase text-gray-500">
              {user?.isGuest ? 'Quyền hạn: Khách vãng lai' : `Hạn mức của bạn (${userRole})`}
            </span>
            <span className="text-xs font-bold text-black">
              {user?.isGuest
                ? '⚠️ Khách chưa thể nhập link'
                : isVipOrAdmin
                ? '⚡ Không giới hạn lượt import'
                : `⚠️ Miễn phí: Đã dùng ${importQuota?.todayImportCount ?? 0}/5 hôm nay (còn ${importQuota?.remaining ?? 5} lượt)`}
            </span>
          </div>
        </div>
        {user?.isGuest ? (
          <button
            onClick={() => navigate('/login')}
            className="btn-comic btn-comic-primary text-[10px] py-1 px-2.5 font-bold"
          >
            <i className="ri-login-box-line font-bold" /> Đăng Nhập
          </button>
        ) : !isVipOrAdmin ? (
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

      {/* Quota Exceeded Warning Banner */}
      {isQuotaExceeded && (
        <div className="card-comic-sm p-3 bg-red-50 border-2 border-red-500 flex items-center justify-between gap-2 shadow-comic-sm">
          <div className="flex items-center gap-2">
            <i className="ri-error-warning-fill text-red-500 text-lg shrink-0" />
            <span className="text-xs font-bold text-red-700 leading-tight">
              Bạn đã dùng hết hạn mức 5 lượt import hôm nay. Vui lòng nâng cấp VIP để tiếp tục không giới hạn!
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/membership')}
            className="btn-comic btn-comic-purple text-[10px] py-1 px-2.5 shrink-0"
          >
            <i className="ri-vip-crown-fill" /> Lên VIP Ngay
          </button>
        </div>
      )}

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

          {/* Error Message Box */}
          {urlError && (
            <div className="card-comic-sm p-3 bg-[#FEE2E2] flex items-center gap-2.5 border-2 border-[#EF4444] text-[#B91C1C] fade-in-comic">
              <i className="ri-error-warning-fill text-lg shrink-0 text-[#DC2626]" />
              <div className="flex flex-col text-xs font-bold">
                <span>{urlError}</span>
                <span className="text-[10px] font-semibold text-gray-600 mt-0.5">Vui lòng kiểm tra lại liên kết YouTube hoặc thử một video hợp lệ khác.</span>
              </div>
            </div>
          )}

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
                Thời Lượng Video 
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

          {/* VIP Only Checkbox & Free Preview Setting */}
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
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

            {isVipOnly && (
              <div className="card-comic-sm p-3 bg-[#FEF9C3] border-2 border-black flex flex-col gap-1.5 shadow-comic-sm ml-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-black flex items-center gap-1">
                      <i className="ri-gift-line text-[#E63946]" /> Số tập cho xem/nghe thử FREE:
                    </span>
                    <span className="text-[10px] font-medium text-gray-700">
                      Mặc định là 1 tập. Nhập 0 để khóa toàn bộ, hoặc 2+ tập cho độc giả nghe thử.
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={freeEpisodesCount}
                    onChange={(e) => setFreeEpisodesCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="input-comic text-xs py-1 px-2 w-20 text-center font-black bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="submit-import-btn"
          type="submit"
          disabled={importMutation.isPending || isQuotaExceeded || !previewData || Boolean(urlError)}
          className={`btn-comic ${
            isQuotaExceeded || !previewData || Boolean(urlError)
              ? 'bg-gray-300 text-gray-600 border-2 border-gray-500 cursor-not-allowed shadow-none'
              : 'btn-comic-primary'
          } text-sm py-3 px-4 font-black shadow-comic-md mt-1`}
        >
          {importMutation.isPending ? (
            <>
              <i className="ri-loader-4-line animate-spin text-lg" />
              <span>Đang xử lý phân tập...</span>
            </>
          ) : isQuotaExceeded ? (
            <>
              <i className="ri-lock-2-line text-lg" />
              <span>Đã Hết Lượt Import Hôm Nay (5/5)</span>
            </>
          ) : !previewData || urlError ? (
            <>
              <i className="ri-error-warning-line text-lg" />
              <span>Vui lòng kiểm tra link YouTube hợp lệ</span>
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

