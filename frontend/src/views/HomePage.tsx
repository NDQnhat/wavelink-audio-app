'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStats } from '@/hooks/useStats';
import { useAudios } from '@/hooks/useAudio';
import { useRecentHistory } from '@/hooks/useHistory';
import { useCategories } from '@/hooks/useCategories';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import { LoadingState } from '@/components/common/LoadingState';
import { HomeSkeleton } from '@/components/common/Skeletons';
import { toast } from '@/components/ui/Toast';
import { formatTime } from '@/lib/utils';
import { AudioItem, Episode } from '@/types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentAudio: playingAudio, isPlaying, play, togglePlay } = usePlayerStore();

  const { data: stats, isLoading: statsLoading } = useStats();
  // Fetch audios for HomePage
  const { data: audios = [], isLoading: audiosLoading } = useAudios({ pageSize: 50 });
  const { data: history = [] } = useRecentHistory();
  const { data: categories = [] } = useCategories();

  // Tab switch: 'latest' (Mới Cập Nhật) vs 'popular' (Phổ Biến)
  const [homeTab, setHomeTab] = useState<'latest' | 'popular'>('latest');

  // In-place category filter on HomePage
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Hero carousel index (Top 3 popular audios)
  const [heroIndex, setHeroIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const userName = user?.username || (user?.isGuest ? 'Khách Nghe Thử' : 'Độc Giả');
  const userRole = user?.role || 'GUEST';

  // 1. Top 3 audios with highest view counts for Hero
  const top3Audios = useMemo(() => {
    if (!audios || audios.length === 0) return [];
    return [...audios]
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 3);
  }, [audios]);

  // Reset heroIndex if top3Audios length changes
  useEffect(() => {
    if (heroIndex >= top3Audios.length && top3Audios.length > 0) {
      setHeroIndex(0);
    }
  }, [top3Audios.length, heroIndex]);

  // 2. Horizontal auto-slider every 5 seconds per audio
  useEffect(() => {
    if (top3Audios.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % top3Audios.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [top3Audios.length, isHovered]);

  // 3. Audio list filtered by selectedCategory and sorted by active tab
  const displayAudios = useMemo(() => {
    let list = [...audios];
    if (selectedCategory !== null) {
      list = list.filter((a) => a.categoryId === selectedCategory);
    }
    if (homeTab === 'popular') {
      list.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    } else {
      list.sort((a, b) => Number(b.id) - Number(a.id));
    }
    return list;
  }, [audios, selectedCategory, homeTab]);

  if (audiosLoading || (statsLoading && audios.length === 0)) {
    return <HomeSkeleton />;
  }

  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name;

  return (
    <div className="flex flex-col w-full px-4 gap-5 pb-36 fade-in-comic">
      {/* 1. Top Greeting Manga Speech Bubble */}
      <div className="pt-2">
        <div className="manga-bubble flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
              Xin chào, <strong className="text-black">{userName}</strong>!
            </span>
            <span className="text-sm font-extrabold text-black leading-tight mt-0.5">
              Hôm nay bạn muốn cày bộ truyện nào?
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <span
              className={`badge-comic ${
                userRole === 'ADMIN'
                  ? 'badge-comic-red'
                  : userRole === 'VIP'
                  ? 'badge-comic-purple'
                  : 'badge-comic-yellow'
              } text-[10px]`}
            >
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* 2. HERO: TOP 3 TRUYỆN PHỔ BIẾN NHẤT (Horizontal Carousel 5s/Audio) */}
      {top3Audios.length > 0 ? (
        <section
          className="flex flex-col gap-2"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Header section with Rank indicator & carousel dots */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <i className="ri-fire-fill text-lg text-[#E63946] animate-pulse" />
              <h2 className="font-extrabold text-sm uppercase text-black tracking-tight">
                Top {top3Audios.length} Phổ Biến Nhất
              </h2>
            </div>
            
            {/* Interactive Dot Indicators */}
            <div className="flex items-center gap-1.5">
              {top3Audios.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setHeroIndex(idx)}
                  className={`transition-all duration-300 rounded-full border-2 border-black ${
                    heroIndex === idx
                      ? 'w-6 h-2.5 bg-[#FFE600] shadow-comic-sm'
                      : 'w-2.5 h-2.5 bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`Chuyển tới truyện số ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Carousel Frame with horizontal slide animation */}
          <div className="card-comic p-0 overflow-hidden bg-white relative shadow-comic">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(-${heroIndex * 100}%)` }}
            >
              {top3Audios.map((audio, idx) => {
                const isThisPlaying = Boolean(isPlaying && playingAudio && String(playingAudio.id) === String(audio.id));
                const currentStoreEp = usePlayerStore.getState().currentEpisode;
                const activeEp =
                  isThisPlaying && currentStoreEp
                    ? currentStoreEp
                    : audio.episodes?.find(
                        (e) =>
                          (audio.currentEpisodeId && e.id === audio.currentEpisodeId) ||
                          (audio.currentEpisodeNumber && e.episodeNumber === audio.currentEpisodeNumber)
                      ) ||
                      audio.episodes?.[0] || {
                        id: 1,
                        episodeNumber: 1,
                        title: 'Tập 1',
                        startSeconds: 0,
                        endSeconds: 14400,
                        duration: 14400,
                      };

                const episodeDuration = activeEp.duration || activeEp.endSeconds - activeEp.startSeconds || 14400;
                const currentPosition = isThisPlaying
                  ? usePlayerStore.getState().currentTime
                  : audio.lastPositionSeconds || 0;
                const progressPercent = audio.progressPercent || Math.min(100, Math.round((currentPosition / episodeDuration) * 100)) || 0;

                const formattedPos = formatTime(currentPosition);
                const formattedEpDuration = formatTime(episodeDuration);

                const handlePlay = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (playingAudio && String(playingAudio.id) === String(audio.id)) {
                    togglePlay();
                  } else {
                    const isVipOrAdmin = user?.role === 'VIP' || user?.role === 'ADMIN' || user?.membership === 'VIP';
                    const isVipAudio = Boolean(audio.isVIPOnly || audio.isVipOnly);
                    const totalEps = audio.totalEpisodes || audio.episodes?.length || 1;
                    if (isVipAudio && !isVipOrAdmin && (totalEps <= 1 || (activeEp && activeEp.episodeNumber > 1))) {
                      toast.error('Nội dung này độc quyền dành riêng cho thành viên VIP. Vui lòng nâng cấp gói!');
                      navigate('/membership');
                      return;
                    }
                    play(audio, activeEp, currentPosition);
                  }
                };

                return (
                  <div key={audio.id} className="w-full shrink-0 p-3.5 flex flex-col gap-3">
                    <div className="flex gap-3">
                      {/* Cover Art */}
                      <div
                        className="relative w-24 h-28 rounded-lg border-2 border-black overflow-hidden shrink-0 bg-black shadow-comic-sm cursor-pointer group"
                        onClick={() => navigate(`/player/${audio.id}`)}
                      >
                        <img
                          src={audio.thumbnailUrl}
                          alt={audio.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        
                        {/* Top Rank Badge */}
                        <span
                          className={`absolute top-1 left-1 badge-comic ${
                            idx === 0
                              ? 'badge-comic-yellow'
                              : idx === 1
                              ? 'badge-comic-blue'
                              : 'badge-comic-red'
                          } text-[9px] py-0 px-1 font-black shadow-sm`}
                        >
                          TOP #{idx + 1}
                        </span>

                        <span className="absolute bottom-1 left-1 badge-comic badge-comic-white text-[8px] py-0 px-1 font-black">
                          TẬP {String(activeEp?.episodeNumber || 1).padStart(2, '0')}
                        </span>
                      </div>

                      {/* Meta Details */}
                      <div className="flex flex-col justify-between min-w-0 flex-1">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="badge-comic badge-comic-blue text-[9px] py-0 px-1.5 font-bold">
                              {audio.categoryName || 'Chung'}
                            </span>

                            {/* View Count Badge */}
                            <span className="badge-comic badge-comic-purple text-[9px] py-0 px-1.5 font-bold flex items-center gap-0.5">
                              <i className="ri-eye-line text-[10px]" /> {(audio.viewCount || 0).toLocaleString()} lượt xem
                            </span>

                            {audio.isVIPOnly && (
                              <span className="badge-comic badge-comic-red text-[9px] py-0 px-1.5 font-bold">
                                VIP
                              </span>
                            )}
                          </div>

                          <h3
                            className="font-extrabold text-sm text-black line-clamp-2 cursor-pointer hover:text-[#3A86FF] transition-colors leading-snug"
                            onClick={() => navigate(`/player/${audio.id}`)}
                          >
                            {audio.title}
                          </h3>
                          <span className="text-xs font-semibold text-gray-600 truncate mt-1">
                            Tác giả: {audio.author || 'Đang cập nhật'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono font-bold text-gray-700 pt-1">
                          <span>{progressPercent > 0 ? formattedPos : 'Khởi đầu'}</span>
                          {progressPercent > 0 && (
                            <span className="badge-comic badge-comic-yellow text-[9px] py-0 px-1 font-mono">
                              TẬP {String(activeEp.episodeNumber || 1).padStart(2, '0')}: {progressPercent}%
                            </span>
                          )}
                          <span className="text-black font-extrabold">
                            {progressPercent > 0 ? formattedEpDuration : audio.formattedDuration || '04:00:00'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (if user has listened) */}
                    {progressPercent > 0 && (
                      <div className="w-full bg-gray-200 h-2.5 rounded-full border-2 border-black overflow-hidden relative shadow-comic-sm">
                        <div
                          className="h-full bg-[#FFE600] transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between pt-1 border-t-2 border-black">
                      <button
                        onClick={() => navigate(`/player/${audio.id}`)}
                        className="btn-comic text-xs py-1.5 px-3 bg-gray-100 hover:bg-gray-200"
                      >
                        <i className="ri-list-check-2 font-bold" /> Danh sách tập
                      </button>
                      <button
                        onClick={handlePlay}
                        className={`btn-comic ${
                          isThisPlaying ? 'btn-comic-yellow' : 'btn-comic-primary'
                        } text-xs py-1.5 px-4 font-black flex items-center gap-1`}
                      >
                        <i
                          className={`${
                            isThisPlaying ? 'ri-pause-fill' : 'ri-play-fill'
                          } text-base`}
                        />
                        <span>
                          {isThisPlaying
                            ? 'Tạm Dừng'
                            : progressPercent > 0
                            ? 'Cày Tiếp'
                            : 'Nghe Ngay'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Left/Right carousel navigation controls */}
            {top3Audios.length > 1 && (
              <>
                <button
                  onClick={() => setHeroIndex((prev) => (prev - 1 + top3Audios.length) % top3Audios.length)}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 border-2 border-black shadow-comic-sm flex items-center justify-center text-black hover:bg-[#FFE600] active:scale-90 transition-all z-10"
                  aria-label="Truyện trước"
                >
                  <i className="ri-arrow-left-s-line font-black text-sm" />
                </button>
                <button
                  onClick={() => setHeroIndex((prev) => (prev + 1) % top3Audios.length)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 border-2 border-black shadow-comic-sm flex items-center justify-center text-black hover:bg-[#FFE600] active:scale-90 transition-all z-10"
                  aria-label="Truyện kế tiếp"
                >
                  <i className="ri-arrow-right-s-line font-black text-sm" />
                </button>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="card-comic p-6 text-center flex flex-col items-center gap-3 bg-white">
          <div className="w-14 h-14 rounded-full border-2 border-black bg-[#FFE600] flex items-center justify-center shadow-comic">
            <i className="ri-headphone-fill text-2xl text-black" />
          </div>
          <h3 className="font-extrabold text-base text-black uppercase">
            Chưa có truyện trong thư viện
          </h3>
          <p className="text-xs font-semibold text-gray-600 max-w-xs">
            Nhập liên kết YouTube để tạo audio cá nhân hóa đầu tiên theo chuẩn máy phát ảo MP3.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="btn-comic btn-comic-yellow text-xs py-2 px-4"
          >
            <i className="ri-add-line font-bold" /> Nhập link YouTube
          </button>
        </section>
      )}

      {/* 3. KHÁM PHÁ THỂ LOẠI (Sort / Lọc ngay trên trang chủ) */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <i className="ri-price-tag-3-fill text-[#3A86FF]" />
            <h2 className="font-extrabold text-sm uppercase text-black tracking-tight">
              Khám Phá Thể Loại
            </h2>
          </div>
          {selectedCategory !== null && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-xs font-bold text-[#FF0055] hover:underline flex items-center gap-0.5"
            >
              <i className="ri-close-circle-line" /> Xóa lọc
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Button "Tất cả" */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`btn-comic text-xs py-1.5 px-3 whitespace-nowrap transition-all ${
              selectedCategory === null ? 'btn-comic-yellow' : 'bg-white hover:bg-gray-50'
            }`}
          >
            <i className="ri-apps-2-line text-sm" />
            <span>Tất cả</span>
          </button>

          {/* Category Pills */}
          {categories.map((c) => {
            const isSelected = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(isSelected ? null : c.id)}
                className={`btn-comic text-xs py-1.5 px-3 whitespace-nowrap transition-all ${
                  isSelected ? 'btn-comic-yellow' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <i className="ri-price-tag-3-line text-sm" />
                <span>{c.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. DANH SÁCH TRUYỆN: TABS "MỚI CẬP NHẬT" & "PHỔ BIẾN" (Có View Count trên mọi thẻ) */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Tabs Switcher */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border-2 border-black shadow-comic-sm">
            <button
              onClick={() => setHomeTab('latest')}
              className={`btn-comic text-xs py-1 px-3 font-black transition-all ${
                homeTab === 'latest'
                  ? 'btn-comic-yellow'
                  : 'bg-transparent border-transparent shadow-none hover:bg-white text-gray-700'
              }`}
            >
              <i className="ri-sparkling-fill text-xs" /> Mới Cập Nhật
            </button>
            <button
              onClick={() => setHomeTab('popular')}
              className={`btn-comic text-xs py-1 px-3 font-black transition-all ${
                homeTab === 'popular'
                  ? 'btn-comic-yellow'
                  : 'bg-transparent border-transparent shadow-none hover:bg-white text-gray-700'
              }`}
            >
              <i className="ri-fire-fill text-xs text-[#E63946]" /> Phổ Biến
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategoryName && (
              <span className="badge-comic badge-comic-blue text-[9px] py-0 px-1.5 font-bold">
                {selectedCategoryName}
              </span>
            )}
            <button
              onClick={() => navigate('/library')}
              className="text-xs font-bold text-[#3A86FF] hover:underline flex items-center"
            >
              Xem tất cả ({displayAudios.length}) <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        </div>

        {/* Audio Cards Horizontal Scroll */}
        {displayAudios.length === 0 ? (
          <div className="card-comic p-6 text-center bg-white flex flex-col items-center gap-2">
            <i className="ri-inbox-line text-3xl text-gray-400" />
            <span className="text-xs font-bold text-gray-600">
              Không có truyện nào phù hợp với bộ lọc hiện tại.
            </span>
            {selectedCategory !== null && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="btn-comic btn-comic-yellow text-xs py-1 px-3 mt-1"
              >
                Xem tất cả thể loại
              </button>
            )}
          </div>
        ) : (
          <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
            {displayAudios.map((audio, index) => (
              <div
                key={audio.id}
                className="w-36 flex flex-col gap-1.5 shrink-0 cursor-pointer group"
                onClick={() => navigate(`/player/${audio.id}`)}
              >
                <div className="card-comic w-full aspect-[3/4] overflow-hidden relative shadow-comic-sm group-hover:translate-x-[-1px] group-hover:translate-y-[-1px] group-hover:shadow-comic transition-all">
                  <img
                    src={audio.thumbnailUrl}
                    alt={audio.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  
                  {/* Top Left: View Count Badge (ÁP DỤNG CHO MỌI THẺ TRUYỆN) */}
                  <span className="absolute top-1.5 left-1.5 badge-comic badge-comic-purple text-[8px] py-0 px-1 font-black flex items-center gap-0.5 shadow-sm">
                    <i className="ri-eye-line text-[9px]" /> {(audio.viewCount || 0).toLocaleString()}
                  </span>

                  {/* Top Right: Ranking or Episode Count */}
                  {homeTab === 'popular' ? (
                    <span
                      className={`absolute top-1.5 right-1.5 badge-comic ${
                        index === 0
                          ? 'badge-comic-yellow'
                          : index === 1
                          ? 'badge-comic-blue'
                          : index === 2
                          ? 'badge-comic-red'
                          : 'badge-comic-white'
                      } text-[8px] py-0 px-1 font-black shadow-sm`}
                    >
                      #{index + 1}
                    </span>
                  ) : (
                    <span className="absolute top-1.5 right-1.5 badge-comic badge-comic-yellow text-[8px] py-0 px-1 font-black">
                      {audio.totalEpisodes || audio.episodes?.length || 1} TẬP
                    </span>
                  )}

                  {/* Bottom: Category Name */}
                  <span className="absolute bottom-1.5 left-1.5 right-1.5 badge-comic badge-comic-blue text-[8px] py-0 px-1 truncate font-bold text-center">
                    {audio.categoryName || 'Chung'}
                  </span>
                </div>

                <div className="flex flex-col">
                  <h3 className="font-extrabold text-xs text-black line-clamp-2 leading-tight group-hover:text-[#3A86FF] transition-colors">
                    {audio.title}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 truncate mt-0.5">
                    <span className="truncate">{audio.author || 'Official'}</span>
                    <span className="text-[10px] font-extrabold text-gray-700 shrink-0 ml-1 flex items-center gap-0.5">
                      <i className="ri-eye-fill text-[9px] text-[#7B2CBF]" /> {audio.viewCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. VỪA CÀY GẦN ĐÂY (Recent History) */}
      {history && history.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm uppercase text-black tracking-tight">
              Vừa Cày Gần Đây
            </h2>
            <span className="badge-comic badge-comic-white text-[9px] font-bold">
              {history.length} bản ghi
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div
                key={`${item.audioId}-${item.episodeId}`}
                className="card-comic-sm p-2.5 flex items-center justify-between gap-2.5 bg-white hover:bg-gray-50 transition-all cursor-pointer"
                onClick={() => navigate(`/player/${item.audioId}`)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg border-2 border-black bg-[#FFE600] flex items-center justify-center text-black shrink-0 shadow-comic-sm">
                    <i className="ri-history-line font-bold" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-extrabold text-xs text-black truncate leading-tight">
                      {item.title || 'Truyện Audio'}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-600 truncate mt-0.5">
                      {item.currentEpisodeTitle || item.episodeTitle || 'Tập 1'} • Mốc:{' '}
                      {item.formattedPosition || '00:00:00'}
                    </span>
                  </div>
                </div>
                <button
                  className="w-8 h-8 rounded-lg border-2 border-black bg-[#3A86FF] text-white flex items-center justify-center shadow-comic-sm hover:scale-105 active:translate-x-0.5 active:translate-y-0.5 shrink-0"
                  aria-label="Phát"
                >
                  <i className="ri-play-fill text-base" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
