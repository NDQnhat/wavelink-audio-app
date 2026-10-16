import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { toast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { CommunityMessage, TopListener, VipRankingMember, WSCommunityMessage } from '@/types';

type TabKey = 'chat' | 'top10' | 'vip';

export const CommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();

  const tabFromUrl = searchParams.get('tab') as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(tabFromUrl === 'top10' || tabFromUrl === 'vip' ? tabFromUrl : 'chat');

  // Shared audio pre-fill from query params if coming from Player share
  const shareAudioIdParam = searchParams.get('shareAudioId');
  const shareTitleParam = searchParams.get('shareTitle');

  // 1. Chat State
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [inputVal, setInputVal] = useState<string>(
    shareTitleParam ? `Đang nghe truyện "${shareTitleParam}" cực hay, anh em vào nghe cùng nhé!` : ''
  );
  const [pendingShareAudioId, setPendingShareAudioId] = useState<number | undefined>(
    shareAudioIdParam ? parseInt(shareAudioIdParam, 10) : undefined
  );
  const [isSending, setIsSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [vipCount, setVipCount] = useState<number>(0);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 2. Leaderboard Top 10 State
  const [topListeners, setTopListeners] = useState<TopListener[]>([]);
  const [loadingTop, setLoadingTop] = useState<boolean>(false);

  // 3. VIP Golden Board State
  const [vipMembers, setVipMembers] = useState<VipRankingMember[]>([]);
  const [loadingVip, setLoadingVip] = useState<boolean>(false);

  // Handle Tab Switch & Sync with URL
  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };

  // ----------------------------------------------------
  // Load Messages & Connect Realtime WebSocket
  // ----------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    // Tải tóm tắt người online và số thành viên VIP thật
    api.community.getOnlineSummary().then((summary) => {
      if (isMounted && summary) {
        if (summary.onlineCount > 0) setOnlineCount(summary.onlineCount);
        setVipCount(summary.vipCount);
      }
    });

    const loadMessages = async () => {
      try {
        const data = await api.community.getMessages();
        if (isMounted) {
          setMessages(data);
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn', err);
      }
    };

    loadMessages();

    // Kết nối WebSocket thời gian thực
    const disconnectWs = api.community.connectWebSocket((wsMsg: WSCommunityMessage) => {
      if (!isMounted) return;

      if (wsMsg.type === 'online_count' && typeof wsMsg.count === 'number') {
        setOnlineCount(wsMsg.count);
      } else if (wsMsg.type === 'new_message' && wsMsg.data) {
        const incoming = wsMsg.data as CommunityMessage;
        setMessages((prev) => {
          // Tránh trùng ID
          if (prev.some((m) => String(m.id) === String(incoming.id))) {
            return prev;
          }
          return [...prev, incoming];
        });
      } else if (wsMsg.type === 'delete_message' && wsMsg.data) {
        const deleted = wsMsg.data as { id: number | string };
        setMessages((prev) => prev.filter((m) => String(m.id) !== String(deleted.id)));
      } else if (wsMsg.type === 'clear_messages') {
        setMessages([]);
      }
    });

    return () => {
      isMounted = false;
      disconnectWs();
    };
  }, []);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (activeTab === 'chat' && typeof chatBottomRef.current?.scrollIntoView === 'function') {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // ----------------------------------------------------
  // Load Leaderboards
  // ----------------------------------------------------
  const fetchTopListeners = async () => {
    setLoadingTop(true);
    try {
      const data = await api.community.getTopListeners();
      setTopListeners(data);
    } catch {
      toast.error('Không thể cập nhật Bảng xếp hạng giờ nghe');
    } finally {
      setLoadingTop(false);
    }
  };

  const fetchVipMembers = async () => {
    setLoadingVip(true);
    try {
      const data = await api.community.getVipLeaderboard();
      setVipMembers(data);
    } catch {
      toast.error('Không thể cập nhật Bảng vàng VIP');
    } finally {
      setLoadingVip(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'top10' && topListeners.length === 0) {
      fetchTopListeners();
    } else if (activeTab === 'vip' && vipMembers.length === 0) {
      fetchVipMembers();
    }
  }, [activeTab]);

  // ----------------------------------------------------
  // Send Chat Message
  // ----------------------------------------------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputVal.trim();
    if (!text || isSending) return;

    setIsSending(true);
    try {
      const senderName = user?.isGuest || user?.role === 'GUEST' || !user?.id ? 'Khách Nghe Thử' : user.username;
      const newMsg = await api.community.sendMessage(text, pendingShareAudioId, senderName);
      // Append if not already added by WS broadcast
      setMessages((prev) => {
        if (prev.some((m) => String(m.id) === String(newMsg.id))) {
          return prev;
        }
        return [...prev, newMsg];
      });
      setInputVal('');
      setPendingShareAudioId(undefined);
      // Clean share query params if any
      if (shareAudioIdParam) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('shareAudioId');
          next.delete('shareTitle');
          return next;
        });
      }
      toast.success('Đã gửi tin nhắn lên cộng đồng!');
    } catch {
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại!');
    } finally {
      setIsSending(false);
    }
  };

  const formatMsgTime = (isoString?: string) => {
    if (!isoString) return 'Vừa xong';
    try {
      const date = new Date(isoString);
      const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
      if (diffMin < 1) return 'Vừa xong';
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      return date.toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Vừa xong';
    }
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
            <span className="text-xs font-bold text-gray-800">
              Giao lưu trực tuyến & Bảng vàng cày truyện VIP
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => navigate('/admin/community')}
              className="btn-comic btn-comic-red text-[10px] py-1.5 px-2.5 flex items-center gap-1 shadow-comic-sm hover:scale-105 transition-all"
              title="Quản lý cộng đồng"
            >
              <i className="ri-shield-star-fill text-[#FFE600]" /> Quản Lý
            </button>
          )}
          <button
            onClick={() => navigate('/membership')}
            className="btn-comic btn-comic-purple text-[10px] py-1.5 px-3 flex items-center gap-1 shadow-comic-sm hover:scale-105 transition-all"
          >
            <i className="ri-vip-crown-fill" /> Lên VIP
          </button>
        </div>
      </div>

      {/* 2. Sub-Tabs Navigation (Comic Pill Buttons) */}
      <div className="flex items-center gap-2 border-b-2 border-black pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabChange('chat')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-black font-black text-xs transition-all shadow-comic-sm ${
            activeTab === 'chat'
              ? 'bg-[#3A86FF] text-white -translate-y-0.5'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <i className="ri-chat-voice-fill" />
          <span>Phòng Chat</span>
          <span className="badge-comic badge-comic-teal text-[8px] py-0 px-1 ml-0.5 font-bold">LIVE</span>
        </button>

        <button
          onClick={() => handleTabChange('top10')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-black font-black text-xs transition-all shadow-comic-sm ${
            activeTab === 'top10'
              ? 'bg-[#FFE600] text-black -translate-y-0.5'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <i className="ri-trophy-fill text-[#D4AF37]" />
          <span>Top 10 Giờ Nghe</span>
        </button>

        <button
          onClick={() => handleTabChange('vip')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border-2 border-black font-black text-xs transition-all shadow-comic-sm ${
            activeTab === 'vip'
              ? 'bg-[#7209B7] text-white -translate-y-0.5'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          <i className="ri-vip-crown-2-fill text-[#FFE600]" />
          <span>Bảng Vàng VIP</span>
          {vipCount > 0 && (
            <span className="badge-comic badge-comic-yellow text-[8px] py-0 px-1 font-bold">
              {vipCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================
          TAB 1: PHÒNG CHAT REALTIME CỘNG ĐỒNG
         ======================================================== */}
      {activeTab === 'chat' && (
        <div className="card-comic p-4 bg-white flex flex-col gap-3 min-h-[460px] relative">
          {/* Top Bar of Chat */}
          <div className="flex items-center justify-between pb-2 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <i className="ri-broadcast-fill text-lg text-[#3A86FF] animate-pulse" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xs uppercase text-black">Thảo Luận Trực Tuyến</span>
                <span className="text-[10px] font-semibold text-gray-500">Tin nhắn cập nhật theo thời gian thực</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              <span className="badge-comic badge-comic-teal text-[9px] font-black">
                {onlineCount} Online
              </span>
            </div>
          </div>

          {/* Banner notification if sharing a story */}
          {pendingShareAudioId && (
            <div className="card-comic-sm p-2 bg-[#FEF9C3] border-2 border-black flex items-center justify-between gap-2 shadow-comic-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-black min-w-0">
                <i className="ri-share-forward-fill text-sm text-[#3A86FF]" />
                <span className="truncate">Đang đính kèm truyện: <span className="font-extrabold underline">{shareTitleParam || 'Truyện hay'}</span></span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPendingShareAudioId(undefined);
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete('shareAudioId');
                    next.delete('shareTitle');
                    return next;
                  });
                }}
                className="text-xs text-red-600 font-bold hover:underline shrink-0 px-1"
                title="Hủy đính kèm"
              >
                ✕ Hủy
              </button>
            </div>
          )}

          {/* Chat Messages Feed */}
          <div className="flex flex-col gap-3 flex-1 max-h-[380px] overflow-y-auto no-scrollbar pr-1 pt-1">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                <i className="ri-chat-smile-3-line text-4xl" />
                <span className="text-xs font-bold">Chưa có tin nhắn nào. Hãy là người đầu tiên lên tiếng!</span>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = user?.username && m.username === user.username;
                const isVipMsg = m.isVip || m.role === 'VIP' || m.role === 'ADMIN';
                const isAdminMsg = m.role === 'ADMIN';

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 px-1">
                      <span
                        onClick={() => {
                          if (m.userId && m.userId > 0) navigate(`/profile/${m.userId}`);
                        }}
                        className={`font-extrabold text-[11px] text-black flex items-center gap-1 ${
                          m.userId && m.userId > 0 ? 'cursor-pointer hover:underline' : ''
                        }`}
                        title={m.userId && m.userId > 0 ? `Xem hồ sơ của ${m.username}` : undefined}
                      >
                        {m.username}
                        {isAdminMsg ? (
                          <span className="badge-comic badge-comic-red text-[7px] py-0 px-1">ADMIN</span>
                        ) : isVipMsg ? (
                          <span className="badge-comic badge-comic-purple text-[7px] py-0 px-1 font-bold">
                            <i className="ri-vip-crown-fill text-[7px] text-[#FFE600]" /> VIP
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[9px] font-semibold text-gray-500">
                        {formatMsgTime(m.createdAt)}
                      </span>
                    </div>

                    {/* Speech Bubble */}
                    <div
                      className={`manga-bubble text-xs max-w-[85%] ${
                        isMe
                          ? '!bg-[#D8F3DC] border-2 border-black shadow-comic-sm'
                          : isVipMsg
                          ? '!bg-[#FFF9DB] border-2 border-black shadow-comic-sm'
                          : 'bg-white border-2 border-black shadow-comic-sm'
                      }`}
                    >
                      <p className="font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {m.message}
                      </p>

                      {/* Embedded Shared Story Card */}
                      {(m.sharedAudio || m.sharedAudioId) && (
                        <div
                          onClick={() => {
                            const targetId = m.sharedAudio?.id || m.sharedAudioId;
                            if (targetId) navigate(`/player/${targetId}`);
                          }}
                          className="mt-2 p-2 bg-white rounded-lg border-2 border-black flex items-center gap-2.5 shadow-comic-sm cursor-pointer hover:bg-yellow-50 transition-all group"
                        >
                          <div className="w-12 h-12 rounded border border-black overflow-hidden bg-black shrink-0 relative">
                            {m.sharedAudio?.thumbnailUrl ? (
                              <img
                                src={m.sharedAudio.thumbnailUrl}
                                alt={m.sharedAudio.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white">
                                <i className="ri-headphone-fill text-lg text-[#FFE600]" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[10px] font-black text-[#3A86FF] uppercase">
                              🎧 Truyện Được Chia Sẻ
                            </span>
                            <span className="font-extrabold text-xs text-black truncate">
                              {m.sharedAudio?.title || 'Bấm để nghe audio'}
                            </span>
                            <span className="text-[9px] font-bold text-gray-500 truncate">
                              {m.sharedAudio?.author || 'Tác giả audio'}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn-comic btn-comic-primary text-[9px] py-1 px-2 shrink-0 group-hover:scale-105 transition-all"
                          >
                            Nghe
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Reaction Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-gray-200">
            {['🔥 Cuốn quá!', '🎧 Đang cày truyện', '👑 Giọng đọc đỉnh', '⭐ Cho xin link với', '❤️ Tuyệt vời'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setInputVal((prev) => (prev ? `${prev} ${tag}` : tag))}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-black bg-gray-50 hover:bg-[#FFE600] shrink-0 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Send Message Form */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t-2 border-black mt-auto">
            <input
              type="text"
              placeholder={user ? "Viết bình luận của bạn..." : "Viết bình luận (với danh tính độc giả)..."}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isSending}
              className="input-comic text-xs flex-1 min-w-0 font-medium"
              required
            />
            <button
              type="submit"
              disabled={isSending || !inputVal.trim()}
              className="btn-comic btn-comic-primary text-xs py-2 px-4 shrink-0 flex items-center justify-center gap-1 shadow-comic-sm disabled:opacity-60"
            >
              <i className={`ri-send-plane-fill ${isSending ? 'animate-pulse' : ''}`} />
              <span>Gửi</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================
          TAB 2: TOP 10 GIỜ NGHE (LEADERBOARD)
         ======================================================== */}
      {activeTab === 'top10' && (
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#FFE600] flex items-center justify-center shadow-comic-sm">
                <i className="ri-trophy-fill text-lg text-black" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-extrabold text-sm uppercase text-black">Top 10 Cao Thủ Cày Giờ</h2>
                <span className="text-[10px] font-bold text-gray-600">
                  Xếp hạng dựa trên tổng thời lượng nghe audio thực tế
                </span>
              </div>
            </div>
            <button
              onClick={fetchTopListeners}
              disabled={loadingTop}
              className="btn-comic text-[10px] py-1 px-2.5 bg-gray-100 flex items-center gap-1"
              title="Làm mới bảng xếp hạng"
            >
              <i className={`ri-refresh-line ${loadingTop ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {loadingTop ? (
            <div className="flex items-center justify-center py-12 font-bold text-xs text-gray-500">
              <i className="ri-loader-4-line animate-spin text-xl mr-2" /> Đang tải bảng xếp hạng...
            </div>
          ) : topListeners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
              <i className="ri-headphone-line text-4xl text-gray-300" />
              <span className="text-xs font-bold text-gray-600">Chưa có độc giả nào phát sinh giờ nghe trong hệ thống.</span>
              <span className="text-[10px] text-gray-400">Hãy là người đầu tiên nghe truyện để lên top!</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {topListeners.map((item) => {
                const isTop1 = item.rank === 1;
                const isTop2 = item.rank === 2;
                const isTop3 = item.rank === 3;

                return (
                  <div
                    key={item.userId || item.username}
                    className={`card-comic-sm p-3 flex items-center justify-between gap-3 border-2 border-black transition-all ${
                      isTop1
                        ? 'bg-[#FEF9C3] shadow-comic-sm scale-[1.01]'
                        : isTop2
                        ? 'bg-[#F3F4F6] shadow-comic-sm'
                        : isTop3
                        ? 'bg-[#FFEDD5] shadow-comic-sm'
                        : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Rank Badge + User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Icon / Number */}
                      <div
                        className={`w-9 h-9 rounded-full border-2 border-black flex items-center justify-center font-black text-sm shrink-0 shadow-comic-sm ${
                          isTop1
                            ? 'bg-[#FFE600] text-black'
                            : isTop2
                            ? 'bg-gray-300 text-black'
                            : isTop3
                            ? 'bg-[#F4A261] text-white'
                            : 'bg-white text-gray-700'
                        }`}
                      >
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${item.rank}`}
                      </div>

                      {/* Username + Stats */}
                      <div className="flex flex-col min-w-0">
                        <div
                          onClick={() => {
                            if (item.userId && item.userId > 0) navigate(`/profile/${item.userId}`);
                          }}
                          className={`flex items-center gap-1.5 ${
                            item.userId && item.userId > 0 ? 'cursor-pointer hover:underline' : ''
                          }`}
                          title={item.userId && item.userId > 0 ? `Xem hồ sơ của ${item.username}` : undefined}
                        >
                          <span className="font-extrabold text-xs text-black truncate">{item.username}</span>
                          {item.isVip && (
                            <span className="badge-comic badge-comic-purple text-[8px] py-0 px-1 font-bold">
                              VIP
                            </span>
                          )}
                          {item.role === 'ADMIN' && (
                            <span className="badge-comic badge-comic-red text-[8px] py-0 px-1">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 truncate">
                          Đã cày: <span className="font-black text-black">{item.totalHours} giờ</span>
                          {item.lastAudioTitle && (
                            <span className="ml-1 text-gray-500 font-semibold truncate">
                              • Đang nghe: {item.lastAudioTitle}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Rank Ribbon */}
                    <div className="shrink-0 flex items-center">
                      {isTop1 ? (
                        <span className="badge-comic badge-comic-purple text-[9px] font-black py-0.5 px-2">
                          QUÁN QUÂN
                        </span>
                      ) : isTop2 ? (
                        <span className="badge-comic badge-comic-blue text-[9px] font-bold py-0.5 px-2">
                          Á QUÂN
                        </span>
                      ) : isTop3 ? (
                        <span className="badge-comic badge-comic-yellow text-[9px] font-bold py-0.5 px-2">
                          TOP 3
                        </span>
                      ) : (
                        <span className="badge-comic badge-comic-white text-[9px] font-bold py-0.5 px-1.5 text-gray-600">
                          TOP {item.rank}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          TAB 3: BẢNG VÀNG VIP (VIP HALL OF FAME)
         ======================================================== */}
      {activeTab === 'vip' && (
        <div className="card-comic p-4 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b-2 border-black">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border-2 border-black bg-[#7209B7] flex items-center justify-center shadow-comic-sm">
                <i className="ri-vip-crown-fill text-lg text-[#FFE600]" />
              </div>
              <div className="flex flex-col">
                <h2 className="font-extrabold text-sm uppercase text-black">Bảng Vàng Độc Giả VIP</h2>
                <span className="text-[10px] font-bold text-gray-600">
                  Vinh danh những thành viên đóng góp và ủng hộ WaveLink Audio
                </span>
              </div>
            </div>
            <button
              onClick={fetchVipMembers}
              disabled={loadingVip}
              className="btn-comic text-[10px] py-1 px-2.5 bg-gray-100 flex items-center gap-1"
              title="Làm mới bảng vàng VIP"
            >
              <i className={`ri-refresh-line ${loadingVip ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>

          {loadingVip ? (
            <div className="flex items-center justify-center py-12 font-bold text-xs text-gray-500">
              <i className="ri-loader-4-line animate-spin text-xl mr-2" /> Đang tải danh sách VIP...
            </div>
          ) : vipMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500 gap-2">
              <i className="ri-vip-crown-line text-4xl text-gray-300" />
              <span className="text-xs font-bold text-gray-600">Chưa có thành viên nào kích hoạt gói VIP.</span>
              <span className="text-[10px] text-gray-400">Đăng ký VIP để nhận huy hiệu bảng vàng độc quyền!</span>
              <button
                onClick={() => navigate('/membership')}
                className="btn-comic btn-comic-purple text-xs py-1.5 px-3 mt-1"
              >
                <i className="ri-vip-crown-fill" /> Nâng Cấp VIP Ngay
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {vipMembers.map((m) => {
                const isAdmin = m.role === 'ADMIN';

                return (
                  <div
                    key={m.userId || m.username}
                    className="card-comic-sm p-3 bg-white flex items-center justify-between gap-3 border-2 border-black shadow-comic-sm hover:border-[#7209B7] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl border-2 border-black bg-gradient-to-tr from-[#7209B7] to-[#F72585] flex items-center justify-center font-black text-white shrink-0 shadow-comic-sm">
                        <i className={`${isAdmin ? 'ri-shield-star-fill text-[#FFE600]' : 'ri-vip-crown-2-fill text-[#FFE600]'} text-xl`} />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div
                          onClick={() => {
                            if (m.userId && m.userId > 0) navigate(`/profile/${m.userId}`);
                          }}
                          className={`flex items-center gap-1.5 flex-wrap ${
                            m.userId && m.userId > 0 ? 'cursor-pointer hover:underline' : ''
                          }`}
                          title={m.userId && m.userId > 0 ? `Xem hồ sơ của ${m.username}` : undefined}
                        >
                          <span className="font-extrabold text-xs text-black">{m.username}</span>
                          <span className="badge-comic badge-comic-purple text-[8px] py-0 px-1 font-black">
                            {m.vipBadge}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-600 mt-0.5">
                          Đã cày: <span className="font-black text-black">{m.totalHours} giờ truyện</span>
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <span className="badge-comic badge-comic-yellow text-[9px] font-black py-0.5 px-2">
                        {isAdmin ? 'ĐIỀU HÀNH' : 'VIP MEMBER'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* VIP Upgrade Callout Card */}
              <div className="card-comic p-4 bg-gradient-to-r from-purple-100 via-pink-50 to-yellow-100 border-2 border-black flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <i className="ri-fire-fill text-xl text-[#F72585]" />
                  <span className="font-black text-xs uppercase text-black">Muốn xuất hiện trên Bảng Vàng VIP?</span>
                </div>
                <p className="text-[11px] font-bold text-gray-700 leading-relaxed">
                  Đăng ký gói VIP để mở khóa kho truyện không giới hạn, tập 4 giờ nghe mượt mà không quảng cáo và nhận huy hiệu danh dự trong phòng chat cộng đồng!
                </p>
                <button
                  onClick={() => navigate('/membership')}
                  className="btn-comic btn-comic-purple text-xs py-2 px-4 self-start flex items-center gap-1.5 shadow-comic mt-1"
                >
                  <i className="ri-vip-crown-fill" />
                  Nâng Cấp VIP Ngay
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

