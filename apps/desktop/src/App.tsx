import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/useAuthStore';
import { useServerStore } from './stores/useServerStore';
import { useMessageStore } from './stores/useMessageStore';
import { ServerSidebar } from './components/layout/ServerSidebar';
import { ChannelSidebar } from './components/layout/ChannelSidebar';
import { MemberList } from './components/layout/MemberList';
import { VirtualizedMessageList } from './components/chat/VirtualizedMessageList';
import { MessageInput } from './components/chat/MessageInput';
import { VoiceRoomOverlay } from './components/voice/VoiceRoomOverlay';
import { Hash, Sparkles } from 'lucide-react';
import type { Message } from './types';

export const App: React.FC = () => {
  const { isAuthenticated, initAuth, login, register } = useAuthStore();
  const { activeChannel, activeServer, fetchServers } = useServerStore();
  const {
    messages,
    fetchMessages,
    fetchMoreMessages,
    sendMessage,
    addMessage,
    typingUsers,
    setTypingUser,
    isLoadingMore,
    hasMore,
  } = useMessageStore();

  // Auth Form State
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchServers();
    }
  }, [isAuthenticated, fetchServers]);

  useEffect(() => {
    if (activeChannel && activeChannel.type === 1) {
      fetchMessages(activeChannel.id);
    }
  }, [activeChannel, fetchMessages]);

  // Global SignalR Event Listeners
  useEffect(() => {
    const handleMessageReceived = (e: Event) => {
      const customEvent = e as CustomEvent<Message>;
      if (customEvent.detail && customEvent.detail.channelId === activeChannel?.id) {
        addMessage(customEvent.detail);
      }
    };

    const handleUserTyping = (e: Event) => {
      const customEvent = e as CustomEvent<{ channelId: string; userId: string; username: string }>;
      if (customEvent.detail && customEvent.detail.channelId === activeChannel?.id) {
        setTypingUser(customEvent.detail.userId, customEvent.detail.username);
      }
    };

    window.addEventListener('pulse_message_received', handleMessageReceived);
    window.addEventListener('pulse_user_typing', handleUserTyping);

    return () => {
      window.removeEventListener('pulse_message_received', handleMessageReceived);
      window.removeEventListener('pulse_user_typing', handleUserTyping);
    };
  }, [activeChannel, addMessage, setTypingUser]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isRegisterMode) {
        await register(authUsername, authDisplayName, authEmail, authPassword);
      } else {
        await login(authEmail, authPassword);
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    }
  };

  // 1. Unauthenticated View (Login / Register)
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

          <h2 className="text-lg font-bold text-white text-center mb-1">
            {isRegisterMode ? 'Create an Account' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-pulse-muted text-center mb-6">
            High-performance, ultra-lightweight team communication.
          </p>

          {authError && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg p-3 mb-4">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="tridev"
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authDisplayName}
                    onChange={(e) => setAuthDisplayName(e.target.value)}
                    placeholder="Trí"
                    className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                {isRegisterMode ? 'Email' : 'Email or Username'}
              </label>
              <input
                type={isRegisterMode ? 'email' : 'text'}
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="tri@pulse.local"
                className="w-full bg-pulse-bg border border-pulse-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pulse-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-pulse-muted mb-1">
                Password
              </label>
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
              {isRegisterMode ? 'Register' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-pulse-muted">
            {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError(null);
              }}
              className="text-pulse-accent hover:underline font-medium ml-1"
            >
              {isRegisterMode ? 'Sign In' : 'Register'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Main Authenticated Workspace
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-pulse-bg select-none">
      <ServerSidebar />
      <ChannelSidebar />

      {/* Main Chat Workspace */}
      <main className="flex-1 flex flex-col min-w-0 bg-pulse-card/20">
        {/* Top Channel Header */}
        <header className="h-14 border-b border-pulse-border px-4 flex items-center justify-between shrink-0 bg-pulse-bg">
          <div className="flex items-center space-x-2">
            <Hash className="w-5 h-5 text-pulse-muted" />
            <h1 className="font-bold text-white text-base">
              {activeChannel ? activeChannel.name : 'Select a channel'}
            </h1>
            {activeChannel?.topic && (
              <>
                <span className="text-pulse-muted">|</span>
                <span className="text-xs text-pulse-muted truncate max-w-md">
                  {activeChannel.topic}
                </span>
              </>
            )}
          </div>
        </header>

        {/* LiveKit Voice Overlay */}
        <VoiceRoomOverlay />

        {/* Chat Feed */}
        {activeChannel ? (
          <div className="flex-1 flex flex-col min-h-0">
            <VirtualizedMessageList
              messages={messages}
              isLoadingMore={isLoadingMore}
              hasMore={hasMore}
              onLoadMore={() => fetchMoreMessages(activeChannel.id)}
            />

            <MessageInput
              channelName={activeChannel.name}
              channelId={activeChannel.id}
              onSendMessage={(content) => sendMessage(activeChannel.id, content)}
              typingUsers={typingUsers}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-pulse-muted text-sm">
            Please select a channel from the left sidebar to start chatting.
          </div>
        )}
      </main>

      {/* Member Sidebar */}
      {activeServer && <MemberList />}
    </div>
  );
};
