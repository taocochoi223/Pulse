import { create } from 'zustand';
import type { Server, Channel, Member, UserStatus } from '../types';
import { apiClient } from '../services/api';
import { signalRService } from '../services/signalr';
import { db } from '../db';

interface ServerState {
  servers: Server[];
  activeServer: Server | null;
  activeChannel: Channel | null;
  members: Member[];
  isLoading: boolean;
  setActiveServer: (server: Server) => Promise<void>;
  setActiveChannel: (channel: Channel) => Promise<void>;
  fetchServers: () => Promise<void>;
  createServer: (name: string, description?: string) => Promise<Server>;
  joinServer: (inviteCode: string) => Promise<Server>;
  deleteOrLeaveServer: (serverId: string) => Promise<void>;
  createChannel: (name: string, type: 1 | 2, topic?: string) => Promise<Channel>;
  deleteChannel: (channelId: string) => Promise<void>;
  updateMemberPresence: (userId: string, status: UserStatus) => void;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServer: null,
  activeChannel: null,
  members: [],
  isLoading: false,

  fetchServers: async () => {
    set({ isLoading: true });
    try {
      // 1. Read instant from Dexie IndexedDB cache
      const cachedServers = await db.servers.toArray();
      if (cachedServers.length > 0) {
        set({ servers: cachedServers });
      }

      // 2. Fetch fresh from API
      const { data } = await apiClient.get<Server[]>('/server');
      set({ servers: data, isLoading: false });
      await db.servers.clear();
      await db.servers.bulkPut(data);

      // Auto-select first server if none selected
      if (!get().activeServer && data.length > 0) {
        await get().setActiveServer(data[0]);
      } else if (get().activeServer) {
        const stillExists = data.find((s) => s.id === get().activeServer?.id);
        if (stillExists) {
          await get().setActiveServer(stillExists);
        } else if (data.length > 0) {
          await get().setActiveServer(data[0]);
        } else {
          set({ activeServer: null, activeChannel: null, members: [] });
        }
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      set({ isLoading: false });
    }
  },

  setActiveServer: async (server: Server) => {
    set({ activeServer: server, members: server.members || [] });
    try {
      const { data } = await apiClient.get<Server>(`/server/${server.id}`);
      set({
        activeServer: data,
        members: data.members || [],
      });

      // Auto-select default channel (first text channel)
      if (data.channels && data.channels.length > 0) {
        const currentChannel = get().activeChannel;
        const channelInThisServer = currentChannel
          ? data.channels.find((c) => c.id === currentChannel.id)
          : null;

        if (!channelInThisServer) {
          const textChannel = data.channels.find((c) => c.type === 1) || data.channels[0];
          await get().setActiveChannel(textChannel);
        }
      } else {
        set({ activeChannel: null });
      }
    } catch (err) {
      console.error('Failed to load server details:', err);
    }
  },

  setActiveChannel: async (channel: Channel) => {
    const currentChannel = get().activeChannel;
    if (currentChannel && currentChannel.id === channel.id) return;

    if (currentChannel && currentChannel.type === 1) {
      await signalRService.leaveChannel(currentChannel.id);
    }

    set({ activeChannel: channel });
    if (channel.type === 1) {
      await signalRService.joinChannel(channel.id);
    }
  },

  createServer: async (name: string, description?: string) => {
    const { data } = await apiClient.post<Server>('/server', {
      name,
      description,
    });
    set((state) => ({ servers: [...state.servers, data] }));
    await db.servers.put(data);
    await get().setActiveServer(data);
    return data;
  },

  joinServer: async (inviteCode: string) => {
    const cleanCode = inviteCode.trim();
    const { data } = await apiClient.post<Server>(`/server/join/${encodeURIComponent(cleanCode)}`);
    set((state) => {
      const exists = state.servers.some((s) => s.id === data.id);
      return {
        servers: exists
          ? state.servers.map((s) => (s.id === data.id ? data : s))
          : [...state.servers, data],
      };
    });
    await db.servers.put(data);
    await get().setActiveServer(data);
    return data;
  },

  deleteOrLeaveServer: async (serverId: string) => {
    await apiClient.delete(`/server/${serverId}`);
    await db.servers.delete(serverId);

    const remaining = get().servers.filter((s) => s.id !== serverId);
    set({ servers: remaining });

    if (get().activeServer?.id === serverId) {
      if (remaining.length > 0) {
        await get().setActiveServer(remaining[0]);
      } else {
        set({ activeServer: null, activeChannel: null, members: [] });
      }
    }
  },

  createChannel: async (name: string, type: 1 | 2, topic?: string) => {
    const activeServer = get().activeServer;
    if (!activeServer) throw new Error('No active server');

    const { data } = await apiClient.post<Channel>('/channel', {
      serverId: activeServer.id,
      name,
      type,
      topic,
    });

    const updatedChannels = [...(activeServer.channels || []), data];
    const updatedServer = { ...activeServer, channels: updatedChannels };
    set({ activeServer: updatedServer });

    await get().setActiveChannel(data);
    return data;
  },

  deleteChannel: async (channelId: string) => {
    const activeServer = get().activeServer;
    if (!activeServer) return;

    await apiClient.delete(`/channel/${channelId}`);
    const updatedChannels = (activeServer.channels || []).filter((c) => c.id !== channelId);
    const updatedServer = { ...activeServer, channels: updatedChannels };
    set({ activeServer: updatedServer });

    if (get().activeChannel?.id === channelId) {
      const next = updatedChannels.find((c) => c.type === 1) || updatedChannels[0] || null;
      if (next) {
        await get().setActiveChannel(next);
      } else {
        set({ activeChannel: null });
      }
    }
  },

  updateMemberPresence: (userId: string, status: UserStatus) => {
    set((state) => {
      const updatedMembers = state.members.map((m) =>
        m.userId === userId ? { ...m, status } : m
      );
      const updatedActiveServer = state.activeServer
        ? { ...state.activeServer, members: updatedMembers }
        : null;
      return {
        members: updatedMembers,
        activeServer: updatedActiveServer,
      };
    });
  },
}));
