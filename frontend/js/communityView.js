export function renderCommunity(container) {
  container.innerHTML = `
    <div class="flex flex-col w-full min-h-screen pb-28 pt-space-base px-margin-sm bg-surface-container-lowest">
      <!-- Header -->
      <div class="flex items-center gap-2 mb-space-md">
        <div class="w-10 h-10 rounded-full flex items-center justify-center bg-primary-container text-on-primary">
          <span class="material-symbols-outlined text-[20px]">forum</span>
        </div>
        <h2 class="font-headline-md font-bold text-on-surface">Cộng đồng VIP</h2>
      </div>

      <!-- Top Mua VIP -->
      <section class="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container p-space-sm mb-space-md">
        <div class="flex items-center gap-2 mb-3 border-b border-surface-container pb-2">
          <span class="material-symbols-outlined text-tertiary text-[20px]">workspace_premium</span>
          <h3 class="font-title-md font-bold text-on-surface">Bảng xếp hạng VIP</h3>
        </div>
        
        <div class="flex flex-col gap-2">
          <!-- Hạng 1 -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-tertiary-container/20 border border-tertiary-container/30">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold font-mono text-xs">1</div>
              <div class="flex flex-col">
                <span class="font-label-md font-bold text-on-surface">HoangAudio</span>
                <span class="font-body-sm text-[10px] text-on-surface-variant">VIP Vĩnh Viễn</span>
              </div>
            </div>
            <span class="material-symbols-outlined text-tertiary text-[18px]">workspace_premium</span>
          </div>

          <!-- Hạng 2 -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-surface-container/50">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center font-bold font-mono text-xs">2</div>
              <div class="flex flex-col">
                <span class="font-label-md font-bold text-on-surface">MinhNhat99</span>
                <span class="font-body-sm text-[10px] text-on-surface-variant">VIP 1 Năm</span>
              </div>
            </div>
          </div>

          <!-- Hạng 3 -->
          <div class="flex items-center justify-between p-2 rounded-lg bg-surface-container-low border border-surface-container/50">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center font-bold font-mono text-xs">3</div>
              <div class="flex flex-col">
                <span class="font-label-md font-bold text-on-surface">LanAnh_VIP</span>
                <span class="font-body-sm text-[10px] text-on-surface-variant">VIP 6 Tháng</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Kênh Chat Chung -->
      <section class="flex-1 bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container p-space-sm flex flex-col min-h-[350px]">
        <div class="flex items-center justify-between mb-3 border-b border-surface-container pb-2">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[20px]">chat</span>
            <h3 class="font-title-md font-bold text-on-surface">Kênh chém gió</h3>
          </div>
          <span class="flex items-center gap-1 font-code-sm text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 124 Online
          </span>
        </div>

        <div class="flex-1 overflow-y-auto flex flex-col gap-3 pb-2" id="chat-messages">
          <div class="flex flex-col gap-1 items-start">
            <div class="flex items-baseline gap-1.5">
              <span class="font-label-sm font-bold text-tertiary">HoangAudio</span>
              <span class="text-[9px] text-on-surface-variant">10:42</span>
            </div>
            <div class="bg-surface-container-low px-3 py-1.5 rounded-xl rounded-tl-none text-sm text-on-surface">
              Bộ audio mới đăng hay quá m.n ơi! 🎧
            </div>
          </div>

          <div class="flex flex-col gap-1 items-start">
            <div class="flex items-baseline gap-1.5">
              <span class="font-label-sm font-bold text-on-surface">User_1849</span>
              <span class="text-[9px] text-on-surface-variant">10:45</span>
            </div>
            <div class="bg-surface-container-low px-3 py-1.5 rounded-xl rounded-tl-none text-sm text-on-surface">
              Chờ mãi mới ra tập tiếp theo, hóng admin lên nhanh 
            </div>
          </div>

          <div class="flex flex-col gap-1 items-start">
            <div class="flex items-baseline gap-1.5">
              <span class="font-label-sm font-bold text-primary">Admin_Tổng</span>
              <span class="text-[9px] text-on-surface-variant">10:50</span>
            </div>
            <div class="bg-primary-container text-on-primary px-3 py-1.5 rounded-xl rounded-tl-none text-sm">
              Đang render nhé các bạn, tối nay sẽ có 4 tập mới. 😉
            </div>
          </div>
        </div>

        <!-- Chat Input -->
        <div class="mt-2 pt-2 border-t border-surface-container flex gap-2">
          <input type="text" id="chat-input" class="flex-1 bg-surface-container-low px-3 py-2 rounded-xl text-sm border border-surface-container outline-none focus:border-primary" placeholder="Nhập tin nhắn..." disabled>
          <button class="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 active:scale-95 transition-transform" onclick="alert('Tính năng chat đang được bảo trì.')">
            <span class="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </section>
    </div>
  `;
}
