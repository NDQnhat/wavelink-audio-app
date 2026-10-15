import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';

interface ChatMessage {
  id: string;
  user: string;
  text: string;
  time: string;
  isVip: boolean;
}

export const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      user: 'HoangAudio',
      text: 'Bộ Phàm Nhân Tu Tiên nghe cuốn thật sự, giọng đọc Bạch Ngọc quá đỉnh!',
      time: '10 phút trước',
      isVip: true,
    },
    {
      id: '2',
      user: 'MinhNhat99',
      text: 'Admin chia tập 4 tiếng nghe vừa vặn cả buổi làm việc.',
      time: '25 phút trước',
      isVip: true,
    },
    {
      id: '3',
      user: 'LanAnh_VIP',
      text: 'Trình phát này hay ở chỗ chạy ngầm màn hình khóa vẫn tua được.',
      time: '1 giờ trước',
      isVip: true,
    },
  ]);

  const [inputVal, setInputVal] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text) return;

    const currentUser = user?.username || 'Bạn';
    const isVip = user?.role === 'VIP' || user?.role === 'ADMIN';

    const newMsg: ChatMessage = {
      id: String(Date.now()),
      user: currentUser,
      text,
      time: 'Vừa xong',
      isVip,
    };

    setMessages([...messages, newMsg]);
    setInputVal('');
    toast.success('Đã gửi tin nhắn!');
  };

  return (
    <div className="flex flex-col w-full pb-36 px-4 gap-4 pt-2 fade-in-comic">
      {/* 1. Header Banner */}
      <div className="card-comic p-4 bg-[#FFE600] flex items-center justify-between border-2 border-black">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-lg border-2 border-black bg-white flex items-center justify-center text-black font-black shadow-comic-sm">
            <i className="ri-group-fill text-xl text-[#3A86FF]" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-extrabold text-base uppercase tracking-tight text-black">Cộng Đồng Độc Giả</h1>
            <span className="text-xs font-bold text-gray-800">Giao lưu & Bảng vàng cày truyện VIP</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/membership')}
          className="btn-comic btn-comic-purple text-[10px] py-1 px-2.5"
        >
          <i className="ri-vip-crown-fill" /> Lên VIP
        </button>
      </div>

      {/* 2. Bảng Vinh Danh VIP (Hall of Fame) */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
          <div className="flex items-center gap-1.5">
            <i className="ri-trophy-fill text-lg text-[#FFE600] drop-shadow-[1px_1px_0_#000]" />
            <span className="font-extrabold text-xs uppercase text-black">Bảng Vàng Độc Giả VIP</span>
          </div>
          <span className="badge-comic badge-comic-yellow text-[9px] font-black">TOP CÀY TRUYỆN</span>
        </div>

        <div className="flex flex-col gap-2">
          {/* Top 1 */}
          <div className="card-comic-sm p-2.5 bg-[#FEF9C3] flex items-center justify-between gap-2.5 border-2 border-black shadow-comic-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#FFE600] flex items-center justify-center font-black text-xs text-black shadow-comic-sm">
                🥇
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs text-black">HoangAudio</span>
                <span className="text-[10px] font-bold text-gray-600">Đã cày: 340 giờ • VIP Kim Cương</span>
              </div>
            </div>
            <span className="badge-comic badge-comic-purple text-[8px] py-0 px-1 font-black">TOP 1</span>
          </div>

          {/* Top 2 */}
          <div className="card-comic-sm p-2.5 bg-white flex items-center justify-between gap-2.5 border border-black">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-200 flex items-center justify-center font-black text-xs text-black">
                🥈
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs text-black">MinhNhat99</span>
                <span className="text-[10px] font-semibold text-gray-600">Đã cày: 215 giờ • VIP 1 Năm</span>
              </div>
            </div>
            <span className="badge-comic badge-comic-blue text-[8px] py-0 px-1 font-bold">TOP 2</span>
          </div>

          {/* Top 3 */}
          <div className="card-comic-sm p-2.5 bg-white flex items-center justify-between gap-2.5 border border-black">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full border-2 border-black bg-[#F4A261] flex items-center justify-center font-black text-xs text-black">
                🥉
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs text-black">LanAnh_VIP</span>
                <span className="text-[10px] font-semibold text-gray-600">Đã cày: 180 giờ • VIP 6 Tháng</span>
              </div>
            </div>
            <span className="badge-comic badge-comic-white text-[8px] py-0 px-1 font-bold">TOP 3</span>
          </div>
        </div>
      </div>

      {/* 3. Kênh Thảo Luận Comic Chat */}
      <div className="card-comic p-4 bg-white flex flex-col gap-3 min-h-[320px]">
        <div className="flex items-center justify-between pb-1.5 border-b-2 border-black">
          <div className="flex items-center gap-1.5">
            <i className="ri-chat-voice-fill text-lg text-[#3A86FF]" />
            <span className="font-extrabold text-xs uppercase text-black">Phòng Thảo Luận Trực Tuyến</span>
          </div>
          <span className="badge-comic badge-comic-teal text-[9px] font-black">● LIVE</span>
        </div>

        {/* Chat messages list */}
        <div className="flex flex-col gap-2.5 flex-1 max-h-64 overflow-y-auto no-scrollbar pr-1">
          {messages.map((m) => (
            <div key={m.id} className="manga-bubble text-xs flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-black flex items-center gap-1">
                  {m.user}
                  {m.isVip && <span className="badge-comic badge-comic-purple text-[7px] py-0 px-1">VIP</span>}
                </span>
                <span className="text-[10px] font-semibold text-gray-500">{m.time}</span>
              </div>
              <p className="font-bold text-gray-800 mt-0.5">{m.text}</p>
            </div>
          ))}
        </div>

        {/* Send Message Form */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t-2 border-black mt-auto">
          <input
            type="text"
            placeholder="Viết bình luận của bạn..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="input-comic text-xs flex-1 min-w-0"
            required
          />
          <button type="submit" className="btn-comic btn-comic-primary text-xs py-2 px-3.5 shrink-0 flex items-center justify-center">
            <i className="ri-send-plane-fill" />
          </button>
        </form>
      </div>
    </div>
  );
};

