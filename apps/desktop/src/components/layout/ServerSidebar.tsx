import React, { useState } from 'react';
import { useServerStore } from '../../stores/useServerStore';
import { Plus, Compass, LogIn, Sparkles, X } from 'lucide-react';

export const ServerSidebar: React.FC = () => {
  const { servers, activeServer, setActiveServer, createServer, joinServer } = useServerStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'create' | 'join'>('create');
  const [newServerName, setNewServerName] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await createServer(newServerName.trim(), newServerDesc.trim() || undefined);
      setNewServerName('');
      setNewServerDesc('');
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Không thể tạo máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim() || isSubmitting) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await joinServer(inviteCodeInput.trim());
      setInviteCodeInput('');
      setIsModalOpen(false);
      setIsExplorerOpen(false);
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || 'Mã mời hoặc đường dẫn không hợp lệ, hoặc máy chủ không tồn tại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <aside className="w-[72px] bg-pulse-bg border-r border-pulse-border flex flex-col items-center py-3 space-y-2 select-none z-20">
      {/* Nút Khám phá & Chuyển nhanh Máy chủ */}
      <button
        onClick={() => {
          setErrorMsg(null);
          setIsExplorerOpen(true);
        }}
        title="Khám phá & Chuyển nhanh Máy chủ"
        className="w-12 h-12 rounded-2xl bg-pulse-card hover:bg-pulse-accent hover:rounded-xl transition-all duration-200 flex items-center justify-center text-pulse-muted hover:text-white shadow-sm"
      >
        <Compass className="w-6 h-6" />
      </button>

      <div className="w-8 h-[2px] bg-pulse-border rounded" />

      {/* Danh sách Máy chủ */}
      <div className="flex-1 w-full flex flex-col items-center space-y-2 overflow-y-auto no-scrollbar">
        {servers.map((server) => {
          const isActive = activeServer?.id === server.id;
          const initials = server.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div key={server.id} className="relative group flex items-center justify-center w-full">
              {/* Thanh đánh dấu đang chọn */}
              <div
                className={`absolute left-0 w-1 bg-white rounded-r transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-2 group-hover:h-5'
                }`}
              />

              <button
                onClick={() => setActiveServer(server)}
                title={server.name}
                className={`w-12 h-12 flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                  isActive
                    ? 'rounded-xl bg-pulse-accent text-white shadow-lg shadow-pulse-accent/30'
                    : 'rounded-2xl bg-pulse-card text-pulse-text hover:rounded-xl hover:bg-pulse-hover hover:text-white'
                }`}
              >
                {server.iconUrl ? (
                  <img
                    src={server.iconUrl}
                    alt={server.name}
                    className="w-full h-full object-cover rounded-[inherit]"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </button>
            </div>
          );
        })}

        {/* Nút Tạo hoặc Tham gia Máy chủ */}
        <button
          onClick={() => {
            setErrorMsg(null);
            setModalTab('create');
            setIsModalOpen(true);
          }}
          title="Tạo mới hoặc Tham gia Máy chủ"
          className="w-12 h-12 rounded-2xl bg-pulse-card hover:bg-emerald-600 hover:rounded-xl transition-all duration-200 flex items-center justify-center text-emerald-400 hover:text-white group"
        >
          <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
        </button>
      </div>

      {/* Hộp thoại Tạo / Tham gia Máy chủ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-pulse-card border border-pulse-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Không Gian Làm Việc Chung</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-pulse-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 2 Tab */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-pulse-bg rounded-xl mb-5 border border-pulse-border">
              <button
                type="button"
                onClick={() => {
                  setModalTab('create');
                  setErrorMsg(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  modalTab === 'create'
                    ? 'bg-pulse-accent text-white shadow'
                    : 'text-pulse-muted hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo Máy Chủ Mới</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalTab('join');
                  setErrorMsg(null);
                }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center space-x-1.5 ${
                  modalTab === 'join'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-pulse-muted hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Nhập Mã / Link Mời</span>
              </button>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg p-3 mb-4">
                {errorMsg}
              </div>
            )}

            {modalTab === 'create' ? (
              <form onSubmit={handleCreateServer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                    Tên Máy Chủ
                  </label>
                  <input
                    type="text"
                    required
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    placeholder="VD: Quí Sửu Tộc, Nhóm Phát Triển..."
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                    Mô tả (Tuỳ chọn)
                  </label>
                  <input
                    type="text"
                    value={newServerDesc}
                    onChange={(e) => setNewServerDesc(e.target.value)}
                    placeholder="Nơi trao đổi dự án & họp nhóm"
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm bg-pulse-accent hover:bg-pulse-accentHover text-white font-semibold rounded-lg transition shadow-lg shadow-pulse-accent/25"
                  >
                    {isSubmitting ? 'Đang tạo...' : 'Tạo Máy Chủ'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinServer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-1.5">
                    Mã Mời hoặc Đường Dẫn (Link) Mời
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    placeholder="VD: a1b2c3d4 hoặc http://localhost:1420/?invite=a1b2c3d4"
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-pulse-muted focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-pulse-muted mt-1.5">
                    Bạn có thể dán mã mời 8 ký tự hoặc dán nguyên đường link mời do chủ Máy chủ gửi.
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                  >
                    Huỷ
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition shadow-lg shadow-emerald-600/25"
                  >
                    {isSubmitting ? 'Đang vào...' : 'Vào Máy Chủ Ngay'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Hộp thoại Tổng quan & Chuyển nhanh Máy chủ */}
      {isExplorerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-pulse-card border border-pulse-border rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-pulse-accent" />
                <h3 className="text-lg font-bold text-white">Tổng Quan & Chuyển Nhanh Máy Chủ</h3>
              </div>
              <button
                onClick={() => setIsExplorerOpen(false)}
                className="text-pulse-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 mb-5">
              {servers.length === 0 ? (
                <div className="text-center py-6 text-sm text-pulse-muted">
                  Bạn chưa tham gia Máy chủ nào. Hãy tạo mới hoặc nhập mã mời bên dưới!
                </div>
              ) : (
                servers.map((srv) => (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setActiveServer(srv);
                      setIsExplorerOpen(false);
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-pulse-bg hover:bg-pulse-hover border border-pulse-border cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-pulse-accent flex items-center justify-center font-bold text-white">
                        {srv.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{srv.name}</div>
                        <div className="text-xs text-pulse-muted">
                          Mã mời: <span className="font-mono text-emerald-400">{srv.inviteCode}</span> •{' '}
                          {srv.memberCount || 1} thành viên
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-lg bg-pulse-card text-pulse-accent font-semibold">
                      Mở
                    </span>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleJoinServer} className="border-t border-pulse-border pt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-2">
                Tham gia nhanh bằng Mã Mời hoặc Link Mời
              </label>
              {errorMsg && (
                <div className="text-xs text-rose-400 mb-2">{errorMsg}</div>
              )}
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  placeholder="Dán mã mời hoặc link mời vào đây..."
                  className="flex-1 bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-pulse-accent"
                />
                <button
                  type="submit"
                  disabled={!inviteCodeInput.trim() || isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                >
                  Tham Gia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
