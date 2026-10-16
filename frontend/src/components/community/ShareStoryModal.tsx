import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { api } from '@/services/api';

export interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  audio: {
    id: number;
    title: string;
    author?: string;
    thumbnailUrl?: string;
  };
}

const QUICK_COMMENTS = [
  'Bộ truyện này nghe cuốn thật sự, mọi người cùng vào nghe nhé!',
  '🔥 Siêu phẩm đỉnh chóp, không thể bỏ lỡ!',
  '🎧 Cày đêm bao phê, giọng đọc quá truyền cảm!',
  '⭐ Vừa nghe xong đoạn này hay quá anh em ơi!',
];

export const ShareStoryModal: React.FC<ShareStoryModalProps> = ({ isOpen, onClose, audio }) => {
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState(QUICK_COMMENTS[0]);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // 1. Chia sẻ ngay lập tức vào phòng Chat Cộng Đồng
  const handleShareToCommunityChat = async () => {
    const text = commentText.trim();
    if (!text) {
      toast.error('Vui lòng nhập lời bình luận');
      return;
    }

    setIsSending(true);
    try {
      await api.community.sendMessage(text, audio.id);
      toast.success('Đã chia sẻ truyện lên Kênh Chat Cộng Đồng! 🎉');
      onClose();
    } catch {
      toast.error('Có lỗi xảy ra khi chia sẻ lên cộng đồng.');
    } finally {
      setIsSending(false);
    }
  };

  // 2. Chuyển hướng tới trang Community kèm prefill
  const handleOpenCommunityWithShare = () => {
    onClose();
    navigate(
      `/community?tab=chat&shareAudioId=${audio.id}&shareTitle=${encodeURIComponent(audio.title)}`
    );
  };

  // 3. Sao chép link truyện
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      toast.success('Đã sao chép liên kết truyện vào bộ nhớ tạm!');
    } else {
      toast.info('Trình duyệt không hỗ trợ sao chép tự động');
    }
  };

  // 4. Chia sẻ qua OS Native Share (nếu có)
  const handleNativeShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: audio.title,
          text: `Đang nghe "${audio.title}" trên WaveLink Audio`,
          url: currentUrl,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chia Sẻ Truyện"
      showFooter={false}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-3 py-1">
        {/* Story Preview Card */}
        <div className="card-comic-sm p-2.5 bg-yellow-50 border-2 border-black flex items-center gap-2.5 shadow-comic-sm">
          <div className="w-12 h-12 rounded border border-black overflow-hidden bg-black shrink-0 relative">
            {audio.thumbnailUrl ? (
              <img src={audio.thumbnailUrl} alt={audio.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white">
                <i className="ri-headphone-fill text-lg text-[#FFE600]" />
              </div>
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="badge-comic badge-comic-blue text-[8px] py-0 px-1 font-bold self-start mb-0.5">
              AUDIOBOOK
            </span>
            <span className="font-extrabold text-xs text-black truncate">{audio.title}</span>
            <span className="text-[10px] font-semibold text-gray-600 truncate">
              {audio.author || 'Tác giả audio'}
            </span>
          </div>
        </div>

        {/* Section 1: GỢI Ý CHIA SẺ LÊN KÊNH CHAT CỘNG ĐỒNG */}
        <div className="card-comic-sm p-3 bg-white border-2 border-black flex flex-col gap-2.5 shadow-comic-sm">
          <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
            <div className="flex items-center gap-1.5">
              <i className="ri-chat-smile-2-fill text-[#3A86FF] text-base" />
              <span className="font-black text-xs uppercase text-black">
                Gợi Ý: Chat Lên Cộng Đồng
              </span>
            </div>
            <span className="badge-comic badge-comic-teal text-[8px] py-0 px-1 font-bold">
              ĐỀ XUẤT
            </span>
          </div>

          <p className="text-[11px] font-bold text-gray-700">
            Đăng ngay lên Phòng Chat để cùng thảo luận và rủ các đạo hữu cày truyện:
          </p>

          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={2}
            className="input-comic text-xs p-2 resize-none font-medium"
            placeholder="Viết cảm nghĩ về truyện này..."
          />

          {/* Quick Comment Pills */}
          <div className="flex flex-wrap gap-1">
            {QUICK_COMMENTS.map((qc, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCommentText(qc)}
                className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-black bg-gray-50 hover:bg-[#FFE600] transition-colors truncate max-w-full text-left"
              >
                {qc}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleShareToCommunityChat}
              disabled={isSending || !commentText.trim()}
              className="btn-comic btn-comic-primary text-xs py-2 px-3 flex-1 flex items-center justify-center gap-1 shadow-comic-sm font-black disabled:opacity-60"
            >
              <i className={`ri-send-plane-fill ${isSending ? 'animate-pulse' : ''}`} />
              <span>Gửi Ngay Vào Chat</span>
            </button>
            <button
              onClick={handleOpenCommunityWithShare}
              className="btn-comic btn-comic-yellow text-xs py-2 px-3 shrink-0 flex items-center justify-center gap-1 shadow-comic-sm font-black"
              title="Đến phòng chat cộng đồng"
            >
              <i className="ri-external-link-line" />
              <span>Đến Kênh Chat</span>
            </button>
          </div>
        </div>

        {/* Section 2: CÁC LỰA CHỌN KHÁC */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="btn-comic text-xs py-2 px-3 flex-1 bg-white border-2 border-black flex items-center justify-center gap-1 shadow-comic-sm hover:bg-gray-50 font-bold"
          >
            <i className="ri-file-copy-line text-sm" />
            <span>Sao Chép Link</span>
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="btn-comic text-xs py-2 px-3 flex-1 bg-white border-2 border-black flex items-center justify-center gap-1 shadow-comic-sm hover:bg-gray-50 font-bold"
            >
              <i className="ri-share-forward-line text-sm" />
              <span>Ứng Dụng Khác</span>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
