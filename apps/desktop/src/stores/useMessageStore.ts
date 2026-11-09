import { create } from 'zustand';
import type { Message, ChannelMessagesResponse } from '../types';
import { apiClient } from '../services/api';
import { db } from '../db';

interface MessageState {
  messages: Message[];
  cursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  typingUsers: { [userId: string]: string }; // userId -> username
  fetchMessages: (channelId: string) => Promise<void>;
  fetchMoreMessages: (channelId: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, replyToMessageId?: string) => Promise<void>;
  addMessage: (message: Message) => void;
  setTypingUser: (userId: string, username: string) => void;
  clearTypingUser: (userId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  isLoadingMore: false,
  typingUsers: {},

  fetchMessages: async (channelId: string) => {
    set({ isLoading: true, messages: [] });

    // 1. Instant load from Dexie cache
    const cached = await db.messages
      .where('channelId')
      .equals(channelId)
      .sortBy('createdAt');

    if (cached.length > 0) {
      set({ messages: cached });
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
        cursor: data.nextCursor,
        hasMore: data.hasMore,
        isLoading: false,
      });

      // Update local IndexedDB cache
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
        cursor: data.nextCursor,
        hasMore: data.hasMore,
        isLoadingMore: false,
      }));

      await db.messages.bulkPut(olderMessages);
    } catch (err) {
      console.error('Failed to fetch older messages:', err);
      set({ isLoadingMore: false });
    }
  },

  sendMessage: async (channelId: string, content: string, replyToMessageId?: string) => {
    const { data } = await apiClient.post<Message>('/message', {
      channelId,
      content,
      replyToMessageId,
    });

    get().addMessage(data);
  },

  addMessage: (message: Message) => {
    set((state) => {
      // Prevent duplicates
      if (state.messages.some((m) => m.id === message.id)) {
        return state;
      }
      return { messages: [...state.messages, message] };
    });

    db.messages.put(message).catch(console.error);
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

