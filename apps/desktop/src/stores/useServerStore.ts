import { create } from 'zustand';
import type { Server, Channel, Member } from '../types';
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
  createChannel: (name: string, type: 1 | 2, topic?: string) => Promise<Channel>;
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
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      set({ isLoading: false });
    }
  },

  setActiveServer: async (server: Server) => {
    set({ activeServer: server });
    try {
      const { data } = await apiClient.get<Server>(`/server/${server.id}`);
      set({ activeServer: data });

      // Auto-select default channel (first text channel)
      if (data.channels && data.channels.length > 0) {
        const textChannel = data.channels.find((c) => c.type === 1) || data.channels[0];
        await get().setActiveChannel(textChannel);
      }
    } catch (err) {
      console.error('Failed to load server details:', err);
    }
  },

  setActiveChannel: async (channel: Channel) => {
    const currentChannel = get().activeChannel;
    if (currentChannel && currentChannel.id === channel.id) return;

    if (currentChannel) {
      await signalRService.leaveChannel(currentChannel.id);
    }

    set({ activeChannel: channel });
    await signalRService.joinChannel(channel.id);
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
}));

