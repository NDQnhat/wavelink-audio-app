import { renderAdminTabs } from './managementViews.js';

export function renderAdmin(container, stats, categories, tags) {
  container.innerHTML = `
    <div class="flex flex-col w-full pb-28">
      <!-- Shared Nav Tabs -->
      ${renderAdminTabs('overview')}

      <div class="px-margin-sm flex flex-col gap-space-lg">
        <!-- Management Header & Quick Action -->
        <section class="flex flex-col gap-space-sm pt-space-xs">
          <div class="flex items-center justify-between gap-space-xs">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface text-label-sm font-label-sm shadow-sm">
              <span class="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              Hệ thống ổn định
            </span>
            <span class="text-label-sm text-on-surface-variant flex items-center gap-1">
              <span class="material-symbols-outlined text-[16px] text-primary">cloud_done</span> v2.4.0
            </span>
          </div>
          <div class="flex items-center justify-between gap-space-sm">
            <div class="flex flex-col">
              <h1 class="font-headline-lg-mobile text-on-surface tracking-tight font-bold">Trung tâm quản trị</h1>
              <p class="font-body-sm text-on-surface-variant">Giám sát tổng thể thư viện audio, thể loại và tập phát</p>
            </div>
            <button onclick="location.hash='#/upload'" class="shrink-0 flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-lg bg-primary-container text-on-primary shadow-sm active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[18px]">add</span>
              <span class="font-label-lg whitespace-nowrap">Thêm mới</span>
            </button>
          </div>
        </section>

        <!-- Navigation Hub Cards: Cho phép click trực tiếp vào từng phân hệ từ UI -->
        <section class="grid grid-cols-2 gap-space-sm">
          <!-- Card 1: Quản lý danh sách Audio -->
          <div onclick="location.hash='#/admin/audios'" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border hover:border-primary-container/30 transition-all active:scale-[0.98]">
            <div class="flex items-center justify-between mb-space-xs">
              <span class="font-label-sm text-on-surface-variant">Danh sách Audio</span>
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[20px]">library_music</span>
              </div>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="font-headline-lg-mobile text-on-surface font-bold">${stats.totalAudios}</span>
              <span class="font-label-sm text-secondary bg-surface-container-high px-1.5 py-0.5 rounded-full">+4</span>
            </div>
            <div class="flex items-center justify-between text-xs text-primary font-semibold mt-2 pt-2 border-t border-surface-container">
              <span>Vào quản lý</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>

          <!-- Card 2: Quản lý Tập -->
          <div onclick="location.hash='#/admin/episodes'" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border hover:border-primary-container/30 transition-all active:scale-[0.98]">
            <div class="flex items-center justify-between mb-space-xs">
              <span class="font-label-sm text-on-surface-variant">Quản lý Tập</span>
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[20px]">splitscreen</span>
              </div>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="font-headline-lg-mobile text-on-surface font-bold">${stats.totalEpisodes}</span>
              <span class="font-label-sm text-on-surface-variant">tập</span>
            </div>
            <div class="flex items-center justify-between text-xs text-primary font-semibold mt-2 pt-2 border-t border-surface-container">
              <span>Xem phân đoạn</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>

          <!-- Card 3: Thể loại & Thẻ -->
          <div onclick="location.hash='#/admin/categories'" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border hover:border-primary-container/30 transition-all active:scale-[0.98]">
            <div class="flex items-center justify-between mb-space-xs">
              <span class="font-label-sm text-on-surface-variant">Thể loại & Thẻ</span>
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[20px]">category</span>
              </div>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="font-headline-lg-mobile text-on-surface font-bold">${categories.length}</span>
              <span class="font-label-sm text-on-surface-variant">thể loại</span>
            </div>
            <div class="flex items-center justify-between text-xs text-primary font-semibold mt-2 pt-2 border-t border-surface-container">
              <span>Xem danh mục</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>

          <!-- Card 4: Cài đặt hệ thống -->
          <div onclick="location.hash='#/settings'" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border hover:border-primary-container/30 transition-all active:scale-[0.98]">
            <div class="flex items-center justify-between mb-space-xs">
              <span class="font-label-sm text-on-surface-variant">Cài đặt hệ thống</span>
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[20px]">settings</span>
              </div>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="font-title-lg text-on-surface font-bold">4 Giờ</span>
              <span class="font-label-sm text-outline">/tập</span>
            </div>
            <div class="flex items-center justify-between text-xs text-primary font-semibold mt-2 pt-2 border-t border-surface-container">
              <span>Đổi thông số</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>
          
          <!-- Card 5: Quản lý Tài Khoản -->
          <div onclick="location.hash='#/admin/accounts'" class="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border hover:border-primary-container/30 transition-all active:scale-[0.98] col-span-2">
            <div class="flex items-center justify-between mb-space-xs">
              <span class="font-label-sm text-on-surface-variant">Quản lý Tài Khoản</span>
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[20px]">group</span>
              </div>
            </div>
            <div class="flex items-baseline gap-1.5">
              <span class="font-title-lg text-on-surface font-bold">Thành viên</span>
              <span class="font-label-sm text-outline">Quyền & VIP</span>
            </div>
            <div class="flex items-center justify-between text-xs text-primary font-semibold mt-2 pt-2 border-t border-surface-container">
              <span>Kiểm soát truy cập</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </div>
          </div>
        </section>

        <!-- Category Management Quick List -->
        <section class="bg-surface-container-lowest rounded-xl p-space-base shadow-sm flex flex-col gap-space-sm">
          <div class="flex items-center justify-between pb-space-xs border-b border-surface-container">
            <h3 class="font-title-md font-bold text-on-surface">Danh mục thể loại nhanh</h3>
            <button onclick="location.hash='#/admin/categories'" class="font-label-sm text-primary font-semibold hover:underline">Quản lý thẻ</button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            ${categories.map(c => `
              <div onclick="location.hash='#/library'" class="p-2.5 rounded-lg bg-surface-container-low flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors">
                <span class="font-label-md text-on-surface truncate">${c.name}</span>
                <span class="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-xs font-bold text-primary">${c.count || 0}</span>
              </div>
            `).join('')}
          </div>
        </section>
      </div>
    </div>
  `;
}
