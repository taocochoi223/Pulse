import React, { useState } from 'react';
import { useServerStore } from '../../stores/useServerStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { VoiceFooter } from './VoiceFooter';
import { Hash, Volume2, Plus, LogOut } from 'lucide-react';
import type { Channel } from '../../types';

export const ChannelSidebar: React.FC = () => {
  const { activeServer, activeChannel, setActiveChannel, createChannel } = useServerStore();
  const { user, logout } = useAuthStore();
  const { joinVoiceRoom, activeVoiceChannel } = useVoiceStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<1 | 2>(1);

  if (!activeServer) {
    return (
      <div className="w-60 bg-pulse-panel border-r border-pulse-border p-4 flex items-center justify-center text-sm text-pulse-muted">
        No server selected
      </div>
    );
  }

  const textChannels = activeServer.channels?.filter((c) => c.type === 1) || [];
  const voiceChannels = activeServer.channels?.filter((c) => c.type === 2) || [];

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelName.trim()) return;
    await createChannel(channelName.trim(), channelType);
    setChannelName('');
    setIsModalOpen(false);
  };

  const handleChannelClick = (channel: Channel) => {
    if (channel.type === 1) {
      setActiveChannel(channel);
    } else if (channel.type === 2) {
      joinVoiceRoom(channel);
    }
  };

  return (
    <aside className="w-60 bg-pulse-panel border-r border-pulse-border flex flex-col justify-between select-none">
      {/* Server Header */}
      <div>
        <div className="h-14 border-b border-pulse-border flex items-center justify-between px-4 font-bold text-white shadow-sm">
          <span className="truncate">{activeServer.name}</span>
        </div>

        {/* Channels List */}
        <div className="p-3 space-y-4 overflow-y-auto">
          {/* Text Channels Section */}
          <div>
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-pulse-muted uppercase tracking-wider mb-1">
              <span>Text Channels</span>
              <button
                onClick={() => {
                  setChannelType(1);
                  setIsModalOpen(true);
                }}
                className="hover:text-white"
                title="Create Text Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {textChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel)}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-pulse-hover text-white'
                        : 'text-pulse-muted hover:bg-pulse-hover/50 hover:text-pulse-text'
                    }`}
                  >
                    <Hash className="w-4 h-4 text-pulse-muted" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Voice Channels Section */}
          <div>
            <div className="flex items-center justify-between px-2 text-xs font-semibold text-pulse-muted uppercase tracking-wider mb-1">
              <span>Voice Rooms</span>
              <button
                onClick={() => {
                  setChannelType(2);
                  setIsModalOpen(true);
                }}
                className="hover:text-white"
                title="Create Voice Room"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5">
              {voiceChannels.map((channel) => {
                const isVoiceActive = activeVoiceChannel?.id === channel.id;
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleChannelClick(channel)}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-sm font-medium transition ${
                      isVoiceActive
                        ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                        : 'text-pulse-muted hover:bg-pulse-hover/50 hover:text-pulse-text'
                    }`}
                  >
                    <Volume2 className="w-4 h-4 text-pulse-muted" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Area */}
      <div>
        <VoiceFooter />

        {/* User Status Bar */}
        <div className="bg-pulse-bg border-t border-pulse-border p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-pulse-accent flex items-center justify-center font-bold text-xs text-white">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-pulse-bg" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{user?.displayName}</div>
              <div className="text-[11px] text-pulse-muted truncate">@{user?.username}</div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg hover:bg-pulse-hover text-pulse-muted hover:text-rose-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-pulse-card border border-pulse-border rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-xl font-bold mb-2 text-white">
              Create {channelType === 1 ? 'Text' : 'Voice'} Channel
            </h3>
            <form onSubmit={handleCreateChannel}>
              <div className="mb-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-pulse-muted mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g. backend-dev"
                  className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-white placeholder-pulse-muted focus:outline-none focus:border-pulse-accent"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-pulse-muted hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-pulse-accent hover:bg-pulse-accentHover text-white font-medium rounded-lg transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
