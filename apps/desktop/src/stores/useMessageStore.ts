import { create } from 'zustand';
import type { Message, ChannelMessagesResponse, AttachmentInput } from '../types';
import { apiClient } from '../services/api';
import { discordBridge } from '../services/discordBridge';
import { useServerStore } from './useServerStore';
import { useAuthStore } from './useAuthStore';
import { db } from '../db';

interface MessageState {
  messages: Message[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  replyingTo: Message | null;
  typingUsers: { [userId: string]: string }; // userId -> username
  fetchMessages: (channelId: string) => Promise<void>;
  fetchMoreMessages: (channelId: string) => Promise<void>;
  sendMessage: (
    channelId: string,
    content: string,
    replyToMessageId?: string,
    attachments?: AttachmentInput[]
  ) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  togglePinMessage: (messageId: string) => Promise<void>;
  setReplyingTo: (message: Message | null) => void;
  addMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  removeMessage: (messageId: string) => void;
  setTypingUser: (userId: string, username: string) => void;
  clearTypingUser: (userId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  replyingTo: null,
  typingUsers: {},

  fetchMessages: async (channelId: string) => {
    set({ isLoading: true, messages: [], replyingTo: null });

    // 1. Instant load from Dexie cache
    try {
      const cached = await db.messages
        .where('channelId')
        .equals(channelId)
        .sortBy('createdAt');

      if (cached.length > 0) {
        set({ messages: cached });
      }
    } catch {
      // Ignore cache read error
    }

    // 2. Fetch fresh from API
    try {
      const { data } = await apiClient.get<ChannelMessagesResponse>(
        `/message/channel/${channelId}?limit=50`
      );

      // Backend returns messages descending; sort ascending for chat view
      const ordered = [...data.messages].reverse();

      set({
        messages: ordered,
        cursor: data.nextCursor ?? null,
        hasMore: data.hasMore,
        isLoading: false,
      });

      // Replace local IndexedDB cache for this channel
      await db.messages.where('channelId').equals(channelId).delete();
      await db.messages.bulkPut(ordered);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      set({ isLoading: false });
    }
  },

  fetchMoreMessages: async (channelId: string) => {
    const { cursor, hasMore, isLoadingMore } = get();
    if (!hasMore || !cursor || isLoadingMore) return;

    set({ isLoadingMore: true });
    try {
      const { data } = await apiClient.get<ChannelMessagesResponse>(
        `/message/channel/${channelId}?cursor=${encodeURIComponent(cursor)}&limit=50`
      );

      const olderMessages = [...data.messages].reverse();

      set((state) => ({
        messages: [...olderMessages, ...state.messages],
        cursor: data.nextCursor ?? null,
        hasMore: data.hasMore,
        isLoadingMore: false,
      }));

      await db.messages.bulkPut(olderMessages);
    } catch (err) {
      console.error('Failed to fetch older messages:', err);
      set({ isLoadingMore: false });
    }
  },

  sendMessage: async (
    channelId: string,
    content: string,
    replyToMessageId?: string,
    attachments?: AttachmentInput[]
  ) => {
    const { data } = await apiClient.post<Message>('/message', {
      channelId,
      content,
      replyToMessageId: replyToMessageId || null,
      attachments: attachments && attachments.length > 0 ? attachments : null,
    });

    set({ replyingTo: null });
    get().addMessage(data);

    // Chuyển tiếp sang Discord nếu máy chủ đã cấu hình Cầu nối Discord
    const activeServer = useServerStore.getState().activeServer;
    const activeChannel = useServerStore.getState().activeChannel;
    const user = useAuthStore.getState().user;
    if (activeServer && discordBridge.hasWebhook(activeServer.id)) {
      discordBridge
        .relayChatMessage({
          serverId: activeServer.id,
          channelName: activeChannel?.name || 'general',
          displayName: user?.displayName || data.sender.displayName || 'Thành viên',
          avatarUrl: user?.avatarUrl || data.sender.avatarUrl,
          content: data.content,
          attachmentUrls: data.attachments?.map((a) => a.fileUrl),
        })
        .catch(() => {});
    }
  },

  editMessage: async (messageId: string, content: string) => {
    const { data } = await apiClient.put<Message>(`/message/${messageId}`, {
      content,
    });
    get().updateMessage(data);
  },

  deleteMessage: async (messageId: string) => {
    await apiClient.delete(`/message/${messageId}`);
    get().removeMessage(messageId);
  },

  togglePinMessage: async (messageId: string) => {
    const { data } = await apiClient.post<Message>(`/message/${messageId}/pin`);
    get().updateMessage(data);
  },

  setReplyingTo: (message: Message | null) => {
    set({ replyingTo: message });
  },

  addMessage: (message: Message) => {
    set((state) => {
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });

    db.messages.put(message).catch(console.error);
  },

  updateMessage: (message: Message) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === message.id ? message : m)),
    }));
    db.messages.put(message).catch(console.error);
  },

  removeMessage: (messageId: string) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    }));
    db.messages.delete(messageId).catch(console.error);
  },

  setTypingUser: (userId: string, username: string) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: username },
    }));

    setTimeout(() => {
      get().clearTypingUser(userId);
    }, 4000);
  },

  clearTypingUser: (userId: string) => {
    set((state) => {
      const updated = { ...state.typingUsers };
      delete updated[userId];
      return { typingUsers: updated };
    });
  },
}));
