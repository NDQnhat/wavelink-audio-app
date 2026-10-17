import React from 'react';

/**
 * Reusable comic-style Skeleton components with backdrop-blur-md
 * Preserves exact layout blocks, prevents layout shift (CLS),
 * and avoids flashing raw dummy text or blank screens when backend is slow.
 */

export const HomeSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full px-4 gap-5 pb-36 pt-2 fade-in-comic">
      {/* Top Greeting Manga Speech Bubble Skeleton */}
      <div className="pt-2">
        <div className="manga-bubble flex items-center justify-between bg-white/70 backdrop-blur-md border-2 border-black animate-pulse">
          <div className="flex flex-col gap-2 min-w-0 flex-1">
            <div className="h-3 bg-gray-300 rounded w-28" />
            <div className="h-4 bg-gray-300 rounded w-48 mt-0.5" />
          </div>
          <div className="w-14 h-5 rounded bg-gray-300 border border-black shrink-0" />
        </div>
      </div>

      {/* Hero Carousel Skeleton */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-300 rounded w-40" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-2.5 rounded-full bg-[#FFE600]/70 border border-black" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 border border-black" />
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300 border border-black" />
          </div>
        </div>

        <div className="card-comic p-3.5 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse shadow-comic">
          <div className="flex gap-3">
            <div className="w-24 h-28 rounded-lg border-2 border-black bg-gray-300 shrink-0" />
            <div className="flex flex-col justify-between flex-1 py-0.5 min-w-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-14 h-4 bg-gray-300 rounded" />
                  <div className="w-20 h-4 bg-gray-300 rounded" />
                </div>
                <div className="h-4 bg-gray-300 rounded w-5/6" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>

          <div className="w-full bg-gray-200 h-2.5 rounded-full border-2 border-black overflow-hidden" />

          <div className="flex items-center justify-between pt-1 border-t-2 border-black">
            <div className="w-28 h-7 bg-gray-200 rounded border border-black" />
            <div className="w-24 h-7 bg-[#FFE600]/70 rounded border border-black" />
          </div>
        </div>
      </section>

      {/* Categories Filter Pills Skeleton */}
      <section className="flex flex-col gap-2">
        <div className="h-4 bg-gray-300 rounded w-36" />
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-20 h-7 rounded bg-white/70 backdrop-blur-md border border-black shrink-0 animate-pulse"
            />
          ))}
        </div>
      </section>

      {/* Audios Tabs & Horizontal Cards Skeleton */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="w-48 h-8 rounded-xl bg-gray-200 border-2 border-black" />
          <div className="w-20 h-4 bg-gray-200 rounded" />
        </div>

        <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-36 flex flex-col gap-1.5 shrink-0 animate-pulse">
              <div className="card-comic w-full aspect-[3/4] bg-white/70 backdrop-blur-md border-2 border-black flex items-center justify-center">
                <i className="ri-loader-4-line text-2xl text-gray-300 animate-spin" />
              </div>
              <div className="h-3.5 bg-gray-300 rounded w-full" />
              <div className="h-2.5 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </section>

      {/* Recent History Section Skeleton */}
      <section className="flex flex-col gap-2">
        <div className="h-4 bg-gray-300 rounded w-32" />
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="card-comic-sm p-2.5 bg-white/70 backdrop-blur-md flex items-center justify-between gap-2.5 border border-black animate-pulse"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg border-2 border-black bg-gray-300 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="h-3.5 bg-gray-300 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-gray-300 shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const LibraryListSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3" id="lib-audio-list-skeleton">
      {[1, 2, 3, 4].map((idx) => (
        <div
          key={idx}
          className="card-comic p-3 flex flex-col gap-2.5 bg-white/70 backdrop-blur-md border-2 border-black animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-20 h-24 rounded-lg border-2 border-black bg-gray-300 flex items-center justify-center shrink-0">
              <i className="ri-loader-4-line text-xl text-gray-400 animate-spin" />
            </div>
            <div className="flex flex-col justify-between flex-1 h-24 py-0.5 min-w-0">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-14 h-4 bg-gray-300 rounded" />
                  <div className="w-10 h-4 bg-gray-300 rounded" />
                </div>
                <div className="h-4 bg-gray-300 rounded w-5/6" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                <div className="h-3 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-black">
            <div className="w-full bg-gray-200 h-2 rounded-full border border-black flex-1" />
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-12 h-6 bg-gray-200 rounded border border-black" />
              <div className="w-12 h-6 bg-gray-300 rounded border border-black" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const PlayerSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* Top Back Button Skeleton */}
      <div className="w-20 h-7 rounded bg-gray-200 border border-black animate-pulse" />

      {/* Master Player Box Skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-4 border-2 border-black animate-pulse shadow-comic">
        <div className="flex gap-3">
          <div className="w-24 h-28 rounded-lg border-2 border-black bg-gray-300 flex items-center justify-center shrink-0">
            <i className="ri-loader-4-line text-2xl text-gray-400 animate-spin" />
          </div>
          <div className="flex flex-col justify-between flex-1 py-1 min-w-0">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-14 h-4 bg-gray-300 rounded" />
                <div className="w-10 h-4 bg-gray-300 rounded" />
              </div>
              <div className="h-5 bg-gray-300 rounded w-5/6" />
              <div className="h-3.5 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="h-3 bg-gray-200 rounded w-28" />
          </div>
        </div>

        {/* Equalizer & Seekbar Skeleton */}
        <div className="flex flex-col gap-2 pt-2 border-t-2 border-black">
          <div className="h-3 bg-gray-200 rounded-full border border-black w-full" />
          <div className="flex justify-between items-center">
            <div className="h-3 bg-gray-200 rounded w-12" />
            <div className="h-3 bg-gray-200 rounded w-12" />
          </div>
        </div>

        {/* Player Controls Skeleton */}
        <div className="flex items-center justify-center gap-3 pt-2 border-t-2 border-black">
          <div className="w-8 h-8 rounded-full bg-gray-200 border border-black" />
          <div className="w-10 h-10 rounded-full bg-gray-200 border border-black" />
          <div className="w-12 h-12 rounded-full bg-gray-300 border-2 border-black" />
          <div className="w-10 h-10 rounded-full bg-gray-200 border border-black" />
          <div className="w-8 h-8 rounded-full bg-gray-200 border border-black" />
        </div>
      </div>

      {/* "Mốc nghe gần đây" card skeleton */}
      <div className="card-comic p-3 bg-white/70 backdrop-blur-md flex items-center justify-between border-2 border-black animate-pulse">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-gray-300" />
          <div className="h-4 bg-gray-300 rounded w-36" />
        </div>
        <div className="w-16 h-5 rounded bg-gray-200" />
      </div>

      {/* Episode list skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
          <div className="h-4 bg-gray-300 rounded w-32" />
          <div className="h-3.5 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="card-comic-sm p-3 bg-gray-50 flex items-center justify-between border border-gray-300"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <div className="w-7 h-7 rounded bg-gray-300 shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="h-3.5 bg-gray-300 rounded w-2/3" />
                  <div className="h-2.5 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
              <div className="w-12 h-6 bg-gray-200 rounded border border-gray-300" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const NotificationsSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* Notification Header Card Skeleton */}
      <div className="card-comic p-4 bg-[#FFE600]/80 backdrop-blur-md flex flex-col gap-2 border-2 border-black animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg border-2 border-black bg-white/80 shrink-0" />
            <div className="flex flex-col gap-1.5">
              <div className="h-5 bg-black/20 rounded w-36" />
              <div className="h-3 bg-black/15 rounded w-48" />
            </div>
          </div>
          <div className="w-14 h-5 rounded bg-black/20" />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black/20">
          <div className="h-7 bg-white/80 rounded border border-black" />
          <div className="h-7 bg-white/80 rounded border border-black" />
        </div>
      </div>

      {/* Notification items skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
          <div className="h-4 bg-gray-300 rounded w-36" />
          <div className="h-3.5 bg-gray-200 rounded w-16" />
        </div>
        <div className="flex flex-col gap-2.5">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="card-comic-sm p-3 bg-white/80 backdrop-blur-sm flex items-start gap-3 border-2 border-black"
            >
              <div className="w-8 h-8 rounded-lg border border-black bg-gray-200 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-300 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
                <div className="h-3 bg-gray-200 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const MembershipSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* VIP Hero Card Skeleton */}
      <div className="card-comic p-5 bg-[#8338EC]/80 backdrop-blur-md text-white flex flex-col gap-3 border-3 border-black shadow-comic-lg animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white/30" />
            <div className="h-5 bg-white/30 rounded w-40" />
          </div>
          <div className="w-16 h-5 rounded bg-white/30" />
        </div>
        <div className="h-3.5 bg-white/20 rounded w-3/4" />
        <div className="h-3 bg-white/20 rounded w-1/2" />
      </div>

      {/* Pricing Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 bg-gray-300 rounded w-24" />
              <div className="w-12 h-4 bg-gray-200 rounded" />
            </div>
            <div className="h-7 bg-gray-300 rounded w-32" />
            <div className="flex flex-col gap-2 pt-2 border-t border-gray-200">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
            <div className="h-9 bg-gray-300 rounded border border-black mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const CommunityListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="card-comic-sm p-3 bg-white/70 backdrop-blur-md flex items-center justify-between gap-3 border-2 border-black animate-pulse"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-full border-2 border-black bg-gray-300 shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="h-3.5 bg-gray-300 rounded w-36" />
              <div className="h-2.5 bg-gray-200 rounded w-48" />
            </div>
          </div>
          <div className="w-14 h-5 rounded bg-gray-200 shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* Banner Card Skeleton */}
      <div className="card-comic p-4 bg-[#FFE600]/80 backdrop-blur-md flex items-center gap-2 border-2 border-black animate-pulse">
        <div className="w-8 h-8 rounded-lg border-2 border-black bg-white/80 shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-4 bg-black/20 rounded w-48" />
          <div className="h-3 bg-black/15 rounded w-64" />
        </div>
      </div>

      {/* Theme Settings Skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 bg-gray-300 rounded w-36" />
          <div className="h-4 bg-gray-200 rounded w-20" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-9 bg-gray-200 rounded border border-black" />
          <div className="h-9 bg-gray-200 rounded border border-black" />
        </div>
      </div>

      {/* Profile Card Skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-44" />
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border-2 border-black bg-gray-300 shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-4 bg-gray-300 rounded w-32" />
            <div className="h-3 bg-gray-200 rounded w-40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="card-comic-sm p-3 bg-white/70 backdrop-blur-md flex items-center justify-between gap-3 border-2 border-black animate-pulse"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg border border-black bg-gray-300 shrink-0" />
            <div className="flex flex-col gap-1.5 min-w-0 flex-1">
              <div className="h-3.5 bg-gray-300 rounded w-1/2" />
              <div className="h-2.5 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <div className="w-12 h-6 bg-gray-200 rounded border border-black" />
            <div className="w-12 h-6 bg-gray-300 rounded border border-black" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const UploadSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full px-4 pb-36 gap-4 pt-2 fade-in-comic">
      {/* 1. Header Banner Skeleton */}
      <div className="card-comic p-4 bg-[#FFE600]/80 backdrop-blur-md flex flex-col gap-2 border-2 border-black animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg border-2 border-black bg-white/80 shrink-0" />
            <div className="h-5 bg-black/20 rounded w-44" />
          </div>
          <div className="w-16 h-5 rounded bg-black/20" />
        </div>
        <div className="h-3 bg-black/15 rounded w-3/4" />
      </div>

      {/* 2. Quota Card Skeleton */}
      <div className="card-comic-sm p-3 bg-white/70 backdrop-blur-md flex flex-col gap-2 border-2 border-black animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-3.5 bg-gray-300 rounded w-36" />
          <div className="h-3.5 bg-gray-300 rounded w-20" />
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full border border-black" />
      </div>

      {/* 3. Form Input Skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-4 border-2 border-black animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-3.5 bg-gray-300 rounded w-32" />
          <div className="h-9 bg-gray-100 rounded border-2 border-black w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-2">
            <div className="h-3.5 bg-gray-300 rounded w-20" />
            <div className="h-9 bg-gray-100 rounded border-2 border-black w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="h-3.5 bg-gray-300 rounded w-24" />
            <div className="h-9 bg-gray-100 rounded border-2 border-black w-full" />
          </div>
        </div>
        <div className="h-10 bg-gray-300 rounded border-2 border-black mt-2" />
      </div>
    </div>
  );
};

export const AdminOverviewSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full pb-36 fade-in-comic">
      {/* Admin Tabs Skeleton */}
      <div className="w-full overflow-x-auto border-b-2 border-black bg-white px-2 py-1.5 flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-20 h-7 rounded bg-gray-200 border border-black shrink-0 animate-pulse" />
        ))}
      </div>

      <div className="px-4 flex flex-col gap-4 pt-2">
        {/* Management Header Skeleton */}
        <section className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <div className="w-28 h-5 rounded bg-gray-200 border border-black animate-pulse" />
            <div className="w-12 h-5 rounded bg-gray-200 border border-black animate-pulse" />
          </div>
          <div className="card-comic p-4 bg-[#FFE600]/80 backdrop-blur-md flex items-center justify-between border-2 border-black animate-pulse">
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-5 bg-black/20 rounded w-44" />
              <div className="h-3.5 bg-black/15 rounded w-64" />
            </div>
            <div className="w-24 h-8 rounded bg-black/20 border border-black shrink-0" />
          </div>
        </section>

        {/* Navigation Hub Cards Skeleton */}
        <section className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="card-comic p-3.5 bg-white/70 backdrop-blur-md flex flex-col justify-between border-2 border-black animate-pulse shadow-comic-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 bg-gray-300 rounded w-16" />
                <div className="w-8 h-8 rounded-lg border-2 border-black bg-gray-300 shrink-0" />
              </div>
              <div className="h-7 bg-gray-300 rounded w-20 my-1" />
              <div className="h-4 bg-gray-200 rounded w-24 pt-2 border-t-2 border-black mt-2" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export const AdminVipSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col w-full px-4 pb-36 gap-4 pt-2 fade-in-comic">
      {/* Admin Tabs Skeleton */}
      <div className="w-full overflow-x-auto border-b-2 border-black bg-white px-2 py-1.5 flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-20 h-7 rounded bg-gray-200 border border-black shrink-0 animate-pulse" />
        ))}
      </div>

      {/* Header Banner Skeleton */}
      <div className="card-comic p-4 bg-[#8338EC]/80 backdrop-blur-md text-white flex flex-col gap-2 border-2 border-black animate-pulse shadow-comic">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/30" />
            <div className="h-5 bg-white/30 rounded w-48" />
          </div>
          <div className="w-20 h-5 rounded bg-white/30" />
        </div>
        <div className="h-3.5 bg-white/20 rounded w-3/4" />
      </div>

      {/* Payment Form Skeleton */}
      <div className="card-comic p-4 bg-white/70 backdrop-blur-md flex flex-col gap-3 border-2 border-black animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-44" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-9 bg-gray-100 rounded border border-black" />
          <div className="h-9 bg-gray-100 rounded border border-black" />
        </div>
      </div>
    </div>
  );
};


