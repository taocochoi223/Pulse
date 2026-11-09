import React, { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useServerStore, extractInviteCode } from './stores/useServerStore';
import { useMessageStore } from './stores/useMessageStore';
import { useVoiceStore } from './stores/useVoiceStore';
import { ServerSidebar } from './components/layout/ServerSidebar';
import { ChannelSidebar } from './components/layout/ChannelSidebar';
import { MemberList } from './components/layout/MemberList';
import { VirtualizedMessageList } from './components/chat/VirtualizedMessageList';
import { MessageInput } from './components/chat/MessageInput';
import { GroupMeetingStage } from './components/voice/GroupMeetingStage';
import { Hash, Sparkles, Volume2, Search, Pin, Users, X, Pencil, Check, Link2 } from 'lucide-react';
import type { Message, VoiceParticipant } from './types';

export const App: React.FC = () => {
  const { isAuthenticated, initAuth, login, register, resetPassword } = useAuthStore();
  const {
    activeChannel,
    activeServer,
    fetchServers,
    joinServer,
    updateChannel,
    updateMemberPresence,
  } = useServerStore();
  const {
    messages,
    fetchMessages,
    fetchMoreMessages,
    sendMessage,
    addMessage,
    updateMessage,
    removeMessage,
    typingUsers,
    setTypingUser,
    isLoadingMore,
    hasMore,
  } = useMessageStore();
  const { setChannelParticipants } = useVoiceStore();

  // Trạng thái Đăng nhập / Đăng ký / Đặt lại mật khẩu
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Mã mời từ đường link (?invite=XXXX hoặc /invite/XXXX)
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('invite');
    if (fromQuery) {
      const code = extractInviteCode(fromQuery);
      localStorage.setItem('pulse_pending_invite', code);
      return code;
    }
    const pathMatch = window.location.pathname.match(/\/invite\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch && pathMatch[1]) {
      const code = pathMatch[1];
      localStorage.setItem('pulse_pending_invite', code);
      return code;
    }
    return localStorage.getItem('pulse_pending_invite');
  });
  const [inviteToast, setInviteToast] = useState<string | null>(null);

  // Trạng thái Thanh tiêu đề
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedPopover, setShowPinnedPopover] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);
  const [isEditingHeaderChannel, setIsEditingHeaderChannel] = useState(false);
  const [headerChannelName, setHeaderChannelName] = useState('');
  const [headerChannelTopic, setHeaderChannelTopic] = useState('');

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Khi đã đăng nhập: tải danh sách Server VÀ tự động vào Server nếu người dùng bấm vào Link mời!
  useEffect(() => {
    if (!isAuthenticated) return;

    const initWorkspace = async () => {
      await fetchServers();

      const codeToJoin = pendingInviteCode || localStorage.getItem('pulse_pending_invite');
      if (codeToJoin) {
        localStorage.removeItem('pulse_pending_invite');
        setPendingInviteCode(null);
        // Xoá ?invite=... trên thanh địa chỉ để gọn gàng
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({}, document.title, '/');
        }
        try {
          const joined = await joinServer(codeToJoin);
          setInviteToast(`🎉 Đã tự động tham gia máy chủ "${joined.name}" thành công!`);
          setTimeout(() => setInviteToast(null), 5000);
        } catch (err: any) {
          setInviteToast(
            err.response?.data?.detail || `Không thể tham gia bằng mã mời "${codeToJoin}".`
          );
          setTimeout(() => setInviteToast(null), 5000);
        }
      }
    };

    initWorkspace();
  }, [isAuthenticated, fetchServers, joinServer, pendingInviteCode]);

  useEffect(() => {
    if (activeChannel && activeChannel.type === 1) {
      fetchMessages(activeChannel.id);
      setSearchQuery('');
      setShowPinnedPopover(false);
    }
  }, [activeChannel, fetchMessages]);

  // Lắng nghe sự kiện thời gian thực từ SignalR
  useEffect(() => {
    const handleMessageReceived = (e: Event) => {
      const customEvent = e as CustomEvent<Message>;
      if (customEvent.detail && customEvent.detail.channelId === activeChannel?.id) {
        addMessage(customEvent.detail);
      }
    };

    const handleMessageUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<Message>;
      if (customEvent.detail && customEvent.detail.channelId === activeChannel?.id) {
        updateMessage(customEvent.detail);
      }
    };

    const handleMessageDeleted = (e: Event) => {
      const customEvent = e as CustomEvent<{ channelId: string; messageId: string }>;
      if (customEvent.detail && customEvent.detail.channelId === activeChannel?.id) {
        removeMessage(customEvent.detail.messageId);
      }
    };

    const handleUserTyping = (e: Event) => {
      const customEvent = e as CustomEvent<{ channelId: string; userId: string; username: string }>;
      if (customEvent.detail && customEvent.detail.channelId === activeChannel?.id) {
        setTypingUser(customEvent.detail.userId, customEvent.detail.username);
      }
    };

    const handlePresenceChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; status: number }>;
      if (customEvent.detail) {
        updateMemberPresence(customEvent.detail.userId, customEvent.detail.status as any);
      }
    };

    const handleVoiceParticipantsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{
        channelId: string;
        participants: VoiceParticipant[];
        startedAt?: string | null;
      }>;
      if (customEvent.detail) {
        setChannelParticipants(
          customEvent.detail.channelId,
          customEvent.detail.participants || [],
          customEvent.detail.startedAt
        );
      }
    };

    window.addEventListener('pulse_message_received', handleMessageReceived);
    window.addEventListener('pulse_message_updated', handleMessageUpdated);
    window.addEventListener('pulse_message_deleted', handleMessageDeleted);
    window.addEventListener('pulse_user_typing', handleUserTyping);
    window.addEventListener('pulse_presence_changed', handlePresenceChanged);
    window.addEventListener('pulse_voice_participants_updated', handleVoiceParticipantsUpdated);

    return () => {
      window.removeEventListener('pulse_message_received', handleMessageReceived);
      window.removeEventListener('pulse_message_updated', handleMessageUpdated);
      window.removeEventListener('pulse_message_deleted', handleMessageDeleted);
      window.removeEventListener('pulse_user_typing', handleUserTyping);
      window.removeEventListener('pulse_presence_changed', handlePresenceChanged);
      window.removeEventListener('pulse_voice_participants_updated', handleVoiceParticipantsUpdated);
    };
  }, [
    activeChannel,
    addMessage,
    updateMessage,
    removeMessage,
    setTypingUser,
    updateMemberPresence,
    setChannelParticipants,
  ]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.sender.displayName.toLowerCase().includes(q) ||
        m.sender.username.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const pinnedMessages = useMemo(() => messages.filter((m) => m.isPinned), [messages]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isResetPasswordMode) {
        await resetPassword(authEmail, authPassword);
      } else if (isRegisterMode) {
        await register(authUsername, authDisplayName, authEmail, authPassword);
      } else {
        await login(authEmail, authPassword);
      }
    } catch (err: any) {
      const validationErrors = err.response?.data?.errors;
      const firstValidationMsg = validationErrors
        ? (Object.values(validationErrors).flat()[0] as string)
        : null;
      setAuthError(
        firstValidationMsg ||
          err.response?.data?.detail ||
          'Xác thực thất bại. Vui lòng kiểm tra lại thông tin.'
      );
    }
  };

  // 1. Màn hình Đăng nhập / Đăng ký / Đặt lại mật khẩu
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-pulse-bg flex items-center justify-center p-4">
        <div className="bg-pulse-card border border-pulse-border rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="flex items-center space-x-2 justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-pulse-accent flex items-center justify-center text-white shadow-lg shadow-pulse-accent/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-wide">PULSE</h1>
          </div>

          {/* Thông báo nếu người dùng bấm vào Link mời */}
          {pendingInviteCode && (
            <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl p-3 mb-5 flex items-start space-x-2">
              <Link2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>
                <div className="font-bold">Bạn nhận được lời mời tham gia Máy chủ!</div>
                <div className="text-[11px] opacity-90 mt-0.5">
                  Mã mời: <span className="font-mono font-bold">{pendingInviteCode}</span> — Hãy đăng nhập hoặc đăng ký tài khoản để hệ thống tự động đưa bạn vào ngay.
                </div>
              </div>
            </div>
          )}

          <h2 className="text-lg font-bold text-white text-center mb-1">
            {isResetPasswordMode
              ? 'Đặt Lại Mật Khẩu Nhanh'
              : isRegisterMode
              ? 'Tạo Tài Khoản Mới'
              : 'Chào Mừng Trở Lại'}
          </h2>
          <p className="text-xs text-pulse-muted text-center mb-6">
            {isResetPasswordMode
              ? 'Nhập Tên đăng nhập (VD: taocochoi223) hoặc Email và mật khẩu mới'
              : 'Nền tảng giao tiếp & họp nhóm tốc độ cao, siêu nhẹ.'}
          </p>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg p-3 mb-4">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegisterMode && !isResetPasswordMode && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                    Tên đăng nhập (Viết liền không dấu)
                  </label>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="VD: tridev"
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                    Tên hiển thị
                  </label>
                  <input
                    type="text"
                    required
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    placeholder="VD: Trí"
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                {isRegisterMode && !isResetPasswordMode
                  ? 'Địa chỉ Email'
                  : 'Email, Tên đăng nhập hoặc Tên hiển thị'}
              </label>
              <input
                type={isRegisterMode && !isResetPasswordMode ? 'email' : 'text'}
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder={
                  isRegisterMode && !isResetPasswordMode
                    ? 'tri@pulse.local'
                    : 'VD: taocochoi223 hoặc Tri'
                }
                className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase text-pulse-muted">
                  {isResetPasswordMode ? 'Mật khẩu mới (tối thiểu 6 ký tự)' : 'Mật khẩu'}
                </label>
                {!isRegisterMode && !isResetPasswordMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetPasswordMode(true);
                      setAuthError(null);
                    }}
                    className="text-[11px] text-pulse-accent hover:underline font-medium"
                  >
                    Quên mật khẩu?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-pulse-accent hover:bg-pulse-accentHover text-white font-semibold rounded-lg transition shadow-lg shadow-pulse-accent/25"
            >
              {isResetPasswordMode
                ? 'Đổi Mật Khẩu & Đăng Nhập Ngay'
                : isRegisterMode
                ? 'Đăng Ký Tài Khoản'
                : 'Đăng Nhập'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-pulse-muted space-y-2">
            {isResetPasswordMode ? (
              <button
                onClick={() => {
                  setIsResetPasswordMode(false);
                  setAuthError(null);
                }}
                className="text-pulse-accent hover:underline font-medium"
              >
                ← Quay lại Đăng Nhập
              </button>
            ) : (
              <div>
                {isRegisterMode ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                <button
                  onClick={() => {
                    setIsRegisterMode(!isRegisterMode);
                    setAuthError(null);
                  }}
                  className="text-pulse-accent hover:underline font-medium ml-1"
                >
                  {isRegisterMode ? 'Đăng Nhập' : 'Đăng Ký Ngay'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Giao diện Không gian làm việc chính
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pulse-bg select-none">
      <ServerSidebar />
      <ChannelSidebar />

      {/* Khu vực Trò chuyện / Phòng họp chính */}
      <main className="flex-1 flex flex-col min-w-0 bg-pulse-card/20 relative">
        {/* Thông báo tự động vào Server qua Link mời */}
        {inviteToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2">
            <span>{inviteToast}</span>
            <button onClick={() => setInviteToast(null)} className="hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Thanh tiêu đề Kênh */}
        <header className="h-14 border-b border-pulse-border px-4 flex items-center justify-between shrink-0 bg-pulse-bg z-20">
          <div className="flex items-center space-x-2 min-w-0">
            {activeChannel?.type === 2 ? (
              <Volume2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Hash className="w-5 h-5 text-pulse-muted shrink-0" />
            )}

            {isEditingHeaderChannel && activeChannel ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!headerChannelName.trim()) return;
                  await updateChannel(
                    activeChannel.id,
                    headerChannelName.trim(),
                    headerChannelTopic.trim() || undefined
                  );
                  setIsEditingHeaderChannel(false);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={headerChannelName}
                  onChange={(e) => setHeaderChannelName(e.target.value)}
                  placeholder="Tên kênh..."
                  className="bg-pulse-card border border-pulse-accent rounded px-2 py-0.5 text-sm font-bold text-white w-36 focus:outline-none"
                  autoFocus
                />
                <input
                  type="text"
                  value={headerChannelTopic}
                  onChange={(e) => setHeaderChannelTopic(e.target.value)}
                  placeholder="Chủ đề kênh..."
                  className="bg-pulse-card border border-pulse-border rounded px-2 py-0.5 text-xs text-white w-48 hidden sm:inline focus:outline-none focus:border-pulse-accent"
                />
                <button
                  type="submit"
                  title="Lưu tên kênh"
                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingHeaderChannel(false)}
                  title="Huỷ"
                  className="p-1 rounded bg-pulse-card hover:bg-pulse-hover text-pulse-muted hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <>
                <h1 className="font-bold text-white text-base truncate">
                  {activeChannel ? activeChannel.name : 'Chọn một kênh'}
                </h1>
                {activeChannel && (
                  <button
                    onClick={() => {
                      setHeaderChannelName(activeChannel.name);
                      setHeaderChannelTopic(activeChannel.topic || '');
                      setIsEditingHeaderChannel(true);
                    }}
                    title="Đổi tên kênh & chủ đề"
                    className="p-1 rounded hover:bg-pulse-hover text-pulse-muted hover:text-white transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
                {activeChannel?.topic && (
                  <>
                    <span className="text-pulse-muted hidden sm:inline">|</span>
                    <span className="text-xs text-pulse-muted truncate max-w-md hidden sm:inline">
                      {activeChannel.topic}
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {/* Cụm công cụ góc trên bên phải */}
          {activeChannel && (
            <div className="flex items-center space-x-2">
              {activeChannel.type === 1 && (
                <>
                  {/* Ô tìm kiếm tin nhắn */}
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-pulse-muted absolute left-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm tin nhắn..."
                      className="bg-pulse-card border border-pulse-border rounded-lg pl-8 pr-6 py-1 text-xs text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent w-36 sm:w-48 transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-pulse-muted hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Nút xem tin nhắn đã ghim */}
                  <div className="relative">
                    <button
                      onClick={() => setShowPinnedPopover((prev) => !prev)}
                      title="Tin nhắn đã ghim"
                      className={`p-1.5 rounded-lg border transition flex items-center space-x-1 ${
                        showPinnedPopover || pinnedMessages.length > 0
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-pulse-card border-pulse-border text-pulse-muted hover:text-white'
                      }`}
                    >
                      <Pin className="w-4 h-4" />
                      {pinnedMessages.length > 0 && (
                        <span className="text-[10px] font-bold">{pinnedMessages.length}</span>
                      )}
                    </button>

                    {showPinnedPopover && (
                      <div className="absolute right-0 mt-2 w-80 bg-pulse-panel border border-pulse-border rounded-xl shadow-2xl p-3 z-40">
                        <div className="flex items-center justify-between border-b border-pulse-border pb-2 mb-2">
                          <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <Pin className="w-3.5 h-3.5 text-amber-400" />
                            <span>Tin nhắn đã ghim ({pinnedMessages.length})</span>
                          </span>
                          <button
                            onClick={() => setShowPinnedPopover(false)}
                            className="text-pulse-muted hover:text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {pinnedMessages.length === 0 ? (
                            <div className="text-xs text-pulse-muted text-center py-4">
                              Chưa có tin nhắn nào được ghim trong kênh này.
                            </div>
                          ) : (
                            pinnedMessages.map((pm) => (
                              <div
                                key={pm.id}
                                className="p-2.5 rounded-lg bg-pulse-bg border border-pulse-border text-xs space-y-1"
                              >
                                <div className="font-bold text-white">{pm.sender.displayName}</div>
                                <div className="text-pulse-text break-words">{pm.content}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Nút Ẩn/Hiện danh sách thành viên */}
              <button
                onClick={() => setShowMemberList((prev) => !prev)}
                title="Ẩn/Hiện danh sách thành viên"
                className={`p-1.5 rounded-lg border transition ${
                  showMemberList
                    ? 'bg-pulse-accent/20 border-pulse-accent/40 text-pulse-accent'
                    : 'bg-pulse-card border-pulse-border text-pulse-muted hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Nội dung chính: Phòng Họp Nhóm HOẶC Kênh Trò Chuyện */}
        {activeChannel?.type === 2 ? (
          <GroupMeetingStage channel={activeChannel} />
        ) : activeChannel ? (
          <div className="flex-1 flex flex-col min-h-0">
            <VirtualizedMessageList
              messages={filteredMessages}
              channelName={activeChannel.name}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={() => fetchMoreMessages(activeChannel.id)}
            />

            <MessageInput
              channelName={activeChannel.name}
              channelId={activeChannel.id}
              onSendMessage={(content, replyId, attachments) =>
                sendMessage(activeChannel.id, content, replyId, attachments)
              }
              typingUsers={typingUsers}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-pulse-muted text-sm">
            Hãy chọn một kênh ở thanh bên trái hoặc tạo Máy chủ mới để bắt đầu trò chuyện.
          </div>
        )}
      </main>

      {/* Cột Thành viên bên phải */}
      {activeServer && showMemberList && <MemberList />}
    </div>
  );
};
