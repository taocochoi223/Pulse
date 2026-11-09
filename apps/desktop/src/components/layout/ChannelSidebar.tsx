import React, { useState } from 'react';
import { useServerStore } from '../../stores/useServerStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { VoiceFooter } from './VoiceFooter';
import {
  Hash,
  Volume2,
  Plus,
  LogOut,
  UserPlus,
  Check,
  Trash2,
  Pencil,
  Settings,
  X,
  MicOff,
  Monitor,
} from 'lucide-react';
import type { Channel, UserStatus } from '../../types';

export const ChannelSidebar: React.FC = () => {
  const {
    activeServer,
    activeChannel,
    setActiveChannel,
    createChannel,
    updateChannel,
    deleteChannel,
    deleteOrLeaveServer,
    fetchServers,
  } = useServerStore();
  const { user, logout, updateProfile } = useAuthStore();
  const { joinVoiceRoom, activeVoiceChannel, channelParticipantsMap } = useVoiceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelTopic, setChannelTopic] = useState('');
  const [channelType, setChannelType] = useState<1 | 2>(1);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Edit Channel Modal State
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelTopic, setEditChannelTopic] = useState('');
  const [isUpdatingChannel, setIsUpdatingChannel] = useState(false);

  // User Profile Settings Modal
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [customStatusInput, setCustomStatusInput] = useState('');
  const [statusInput, setStatusInput] = useState<number>(1);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  if (!activeServer) {
    return (
      <div className="w-60 bg-pulse-panel border-r border-pulse-border p-4 flex flex-col items-center justify-center text-center text-sm text-pulse-muted">
        <p>Chưa chọn Server nào.</p>
        <p className="text-xs mt-1">Hãy bấm nút (+) ở thanh bên trái để tạo hoặc tham gia Server!</p>
      </div>
    );
  }

  const textChannels = activeServer.channels?.filter((c) => c.type === 1) || [];
  const voiceChannels = activeServer.channels?.filter((c) => c.type === 2) || [];

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    const normalized = channelName.trim().replace(/\s+/g, '-');
    await createChannel(normalized, channelType, channelTopic.trim() || undefined);
    setChannelName('');
    setChannelTopic('');
    setIsModalOpen(false);
  };

  const openEditChannelModal = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(channel);
    setEditChannelName(channel.name);
    setEditChannelTopic(channel.topic || '');
  };

  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel || !editChannelName.trim() || isUpdatingChannel) return;
    setIsUpdatingChannel(true);
    try {
      await updateChannel(
        editingChannel.id,
        editChannelName.trim(),
        editChannelTopic.trim() || undefined
      );
      setEditingChannel(null);
    } finally {
      setIsUpdatingChannel(false);
    }
  };

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel);
    if (channel.type === 2) {
      joinVoiceRoom(channel);
    }
  };

  const copyInviteCode = () => {
    if (activeServer?.inviteCode) {
      navigator.clipboard.writeText(activeServer.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const openProfileModal = () => {
    if (!user) return;
    setDisplayNameInput(user.displayName || '');
    setAvatarUrlInput(user.avatarUrl || '');
    setCustomStatusInput(user.customStatus || '');
    const numericStatus =
      typeof user.status === 'number'
        ? user.status
        : user.status === 'Idle'
        ? 2
        : user.status === 'DoNotDisturb'
        ? 3
        : 1;
    setStatusInput(numericStatus);
    setIsProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim() || isSavingProfile) return;
    setIsSavingProfile(true);
    try {
      await updateProfile({
        displayName: displayNameInput.trim(),
        avatarUrl: avatarUrlInput.trim() || null,
        status: statusInput as UserStatus,
        customStatus: customStatusInput.trim() || null,
      });
      await fetchServers();
      setIsProfileOpen(false);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const isServerOwner = activeServer.ownerId === user?.id;

  return (
    <aside className="w-60 bg-pulse-panel border-r border-pulse-border flex flex-col justify-between select-none shrink-0">
      {/* Server Header */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="h-14 border-b border-pulse-border flex items-center justify-between px-3 font-bold text-white shadow-sm shrink-0">
          <span className="truncate max-w-[115px]" title={activeServer.name}>
            {activeServer.name}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={copyInviteCode}
              title={`Copy Mã Mời: ${activeServer.inviteCode}`}
              className="text-xs bg-pulse-card hover:bg-pulse-accent text-pulse-muted hover:text-white px-2 py-1 rounded-md transition flex items-center space-x-1 border border-pulse-border/50"
            >
              {copiedInvite ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Đã chép</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </>
              )}
            </button>
            <button
              onClick={async () => {
                const actionText = isServerOwner ? 'xoá Server này' : 'rời khỏi Server này';
                if (window.confirm(`Bạn có chắc muốn ${actionText} không?`)) {
                  await deleteOrLeaveServer(activeServer.id);
                }
              }}
              title={isServerOwner ? 'Xoá Server' : 'Rời Server'}
              className="p-1.5 rounded-md bg-pulse-card hover:bg-rose-500/20 text-pulse-muted hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 p-3 space-y-5 overflow-y-auto">
          {/* Text Channels Section */}
          <div>
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-pulse-muted uppercase tracking-wider mb-1.5">
              <span>Kênh Chat (Text)</span>
              <button
                onClick={() => {
                  setChannelType(1);
                  setIsModalOpen(true);
                }}
                className="hover:text-white p-0.5 rounded hover:bg-pulse-hover"
                title="Tạo Kênh Chat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {textChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                return (
                  <div
                    key={channel.id}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-pulse-hover text-white'
                        : 'text-pulse-muted hover:bg-pulse-hover/50 hover:text-pulse-text'
                    }`}
                    onClick={() => handleChannelClick(channel)}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Hash className="w-4 h-4 text-pulse-muted shrink-0" />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={(e) => openEditChannelModal(channel, e)}
                        title="Đổi tên / Chỉnh sửa kênh"
                        className="text-pulse-muted hover:text-white p-0.5 rounded hover:bg-pulse-card transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (window.confirm(`Bạn có chắc muốn xoá kênh #${channel.name} không?`)) {
                            await deleteChannel(channel.id);
                          }
                        }}
                        title="Xoá kênh"
                        className="text-pulse-muted hover:text-rose-400 p-0.5 rounded hover:bg-pulse-card transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice Rooms (Group Meeting) Section */}
          <div>
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-pulse-muted uppercase tracking-wider mb-1.5">
              <span>Phòng Họp (Voice/Video)</span>
              <button
                onClick={() => {
                  setChannelType(2);
                  setIsModalOpen(true);
                }}
                className="hover:text-white p-0.5 rounded hover:bg-pulse-hover"
                title="Tạo Phòng Họp Nhóm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {voiceChannels.map((channel) => {
                const isSelected = activeChannel?.id === channel.id;
                const isVoiceConnected = activeVoiceChannel?.id === channel.id;
                const roomMembers = channelParticipantsMap[channel.id] || [];

                return (
                  <div key={channel.id} className="space-y-1">
                    <div
                      onClick={() => handleChannelClick(channel)}
                      className={`group w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                        isSelected
                          ? 'bg-pulse-accent/20 text-pulse-accent border border-pulse-accent/30 font-semibold'
                          : 'text-pulse-muted hover:bg-pulse-hover/50 hover:text-pulse-text'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <Volume2
                          className={`w-4 h-4 shrink-0 ${
                            isVoiceConnected ? 'text-emerald-400' : 'text-pulse-muted'
                          }`}
                        />
                        <span className="truncate">{channel.name}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => openEditChannelModal(channel, e)}
                            title="Đổi tên phòng họp"
                            className="text-pulse-muted hover:text-white p-0.5 rounded hover:bg-pulse-card transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (window.confirm(`Bạn có chắc muốn xoá phòng họp "${channel.name}" không?`)) {
                                await deleteChannel(channel.id);
                              }
                            }}
                            title="Xoá phòng họp"
                            className="text-pulse-muted hover:text-rose-400 p-0.5 rounded hover:bg-pulse-card transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {roomMembers.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                            {roomMembers.length}
                          </span>
                        )}
                        {isVoiceConnected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Active Participants inside this Voice Room */}
                    {roomMembers.length > 0 && (
                      <div className="pl-6 pr-2 space-y-1 py-0.5">
                        {roomMembers.map((p) => (
                          <div
                            key={p.connectionId || p.identity}
                            className="flex items-center justify-between text-xs text-pulse-text py-1 px-2 rounded-md bg-pulse-bg/50"
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <div
                                className={`w-5 h-5 rounded-full bg-pulse-accent flex items-center justify-center text-[10px] font-bold text-white ${
                                  p.isSpeaking ? 'ring-2 ring-emerald-400' : ''
                                }`}
                              >
                                {p.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="truncate text-[11px]">{p.name}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-pulse-muted">
                              {p.isMuted && <MicOff className="w-3 h-3 text-rose-400" />}
                              {p.isScreenSharing && (
                                <Monitor className="w-3 h-3 text-indigo-400" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div className="shrink-0">
        <VoiceFooter />

        {/* User Status Bar */}
        <div className="bg-pulse-bg border-t border-pulse-border p-2.5 flex items-center justify-between">
          <div
            onClick={openProfileModal}
            title="Chỉnh sửa Hồ sơ & Trạng thái"
            className="flex items-center space-x-2.5 overflow-hidden cursor-pointer hover:bg-pulse-hover/60 p-1 rounded-lg transition flex-1 mr-1"
          >
            <div className="relative shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-pulse-accent flex items-center justify-center font-bold text-xs text-white">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-pulse-bg" />
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-bold text-white truncate">{user?.displayName}</div>
              <div className="text-[11px] text-pulse-muted truncate">
                {user?.customStatus || `@${user?.username}`}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-0.5">
            <button
              onClick={openProfileModal}
              title="Cài đặt tài khoản"
              className="p-1.5 rounded-lg hover:bg-pulse-hover text-pulse-muted hover:text-white transition"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 rounded-lg hover:bg-pulse-hover text-pulse-muted hover:text-rose-400 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Channel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-pulse-card border border-pulse-border rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-bold mb-3 text-white">
              Tạo {channelType === 1 ? 'Kênh Chat (Text)' : 'Phòng Họp (Voice/Video)'}
            </h3>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                  Tên Kênh / Phòng
                </label>
                <input
                  type="text"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder={channelType === 1 ? 'VD: backend-dev' : 'VD: Daily-Standup'}
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                  Chủ đề (Tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={channelTopic}
                  onChange={(e) => setChannelTopic(e.target.value)}
                  placeholder="Mô tả ngắn gọn nội dung kênh..."
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-pulse-accent hover:bg-pulse-accentHover text-white font-semibold rounded-lg transition"
                >
                  Tạo Kênh
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {editingChannel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-pulse-card border border-pulse-border rounded-2xl p-6 w-96 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-white">
                Chỉnh Sửa {editingChannel.type === 1 ? 'Kênh Chat' : 'Phòng Họp'}
              </h3>
              <button
                onClick={() => setEditingChannel(null)}
                className="text-pulse-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                  Tên Kênh / Phòng
                </label>
                <input
                  type="text"
                  required
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  placeholder="Nhập tên kênh mới..."
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                  Chủ đề (Topic)
                </label>
                <input
                  type="text"
                  value={editChannelTopic}
                  onChange={(e) => setEditChannelTopic(e.target.value)}
                  placeholder="Mô tả chủ đề của kênh..."
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      editingChannel &&
                      window.confirm(`Bạn có chắc muốn xoá "${editingChannel.name}" không?`)
                    ) {
                      await deleteChannel(editingChannel.id);
                      setEditingChannel(null);
                    }
                  }}
                  className="px-3 py-2 text-xs bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-semibold rounded-lg transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xoá Kênh</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingChannel(null)}
                    className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingChannel}
                    className="px-5 py-2 text-sm bg-pulse-accent hover:bg-pulse-accentHover text-white font-semibold rounded-lg transition shadow-lg shadow-pulse-accent/25"
                  >
                    {isUpdatingChannel ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Settings Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-pulse-card border border-pulse-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Hồ Sơ Cá Nhân & Trạng Thái</h3>
              <button
                onClick={() => setIsProfileOpen(false)}
                className="text-pulse-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                  Tên hiển thị (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                  Trạng thái hoạt động
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(Number(e.target.value))}
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                >
                  <option value={1}>🟢 Trực tuyến (Online)</option>
                  <option value={2}>🌙 Tạm vắng (Idle)</option>
                  <option value={3}>⛔ Không làm phiền (Do Not Disturb)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                  Dòng trạng thái tuỳ chỉnh (Custom Status)
                </label>
                <input
                  type="text"
                  value={customStatusInput}
                  onChange={(e) => setCustomStatusInput(e.target.value)}
                  placeholder="VD: Đang code tính năng mới 🚀"
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                  URL Ảnh đại diện (Tuỳ chọn)
                </label>
                <input
                  type="url"
                  value={avatarUrlInput}
                  onChange={(e) => setAvatarUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 text-sm bg-pulse-accent hover:bg-pulse-accentHover text-white font-semibold rounded-lg transition"
                >
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu Hồ Sơ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
