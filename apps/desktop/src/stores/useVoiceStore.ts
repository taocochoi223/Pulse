import { create } from 'zustand';
import type { Channel, VoiceParticipant } from '../types';
import { liveKitService } from '../services/livekit';
import { useAuthStore } from './useAuthStore';

interface VoiceState {
  activeVoiceChannel: Channel | null;
  isConnected: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  participants: VoiceParticipant[];
  channelParticipantsMap: { [channelId: string]: VoiceParticipant[] };
  joinVoiceRoom: (channel: Channel) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  setChannelParticipants: (channelId: string, participants: VoiceParticipant[]) => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeVoiceChannel: null,
  isConnected: false,
  isMuted: false,
  isCameraOn: false,
  isScreenSharing: false,
  participants: [],
  channelParticipantsMap: {},

  joinVoiceRoom: async (channel: Channel) => {
    if (get().activeVoiceChannel?.id === channel.id && get().isConnected) return;

    if (get().isConnected) {
      await get().leaveVoiceRoom();
    }

    const user = useAuthStore.getState().user;
    const displayName = user?.displayName || user?.username || 'Member';
    const avatarUrl = user?.avatarUrl;

    set({
      activeVoiceChannel: channel,
      isConnected: true,
      isMuted: false,
      isCameraOn: false,
      isScreenSharing: false,
    });

    try {
      await liveKitService.joinRoom(channel.id, displayName, avatarUrl, (participants) => {
        set((state) => ({
          participants,
          channelParticipantsMap: {
            ...state.channelParticipantsMap,
            [channel.id]: participants,
          },
        }));
      });
    } catch (err) {
      console.error('Failed to join voice room:', err);
    }
  },

  leaveVoiceRoom: async () => {
    const oldChannelId = get().activeVoiceChannel?.id;
    await liveKitService.leaveRoom();
    set((state) => {
      const updatedMap = { ...state.channelParticipantsMap };
      if (oldChannelId) {
        delete updatedMap[oldChannelId];
      }
      return {
        activeVoiceChannel: null,
        isConnected: false,
        participants: [],
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: false,
        channelParticipantsMap: updatedMap,
      };
    });
  },

  toggleMute: async () => {
    const isMuted = await liveKitService.toggleMute();
    set({ isMuted });
  },

  toggleCamera: async () => {
    const isCameraOn = await liveKitService.toggleCamera();
    set({ isCameraOn });
  },

  toggleScreenShare: async () => {
    const isScreenSharing = await liveKitService.toggleScreenShare();
    set({ isScreenSharing });
  },

  setChannelParticipants: (channelId: string, participants: VoiceParticipant[]) => {
    set((state) => ({
      channelParticipantsMap: {
        ...state.channelParticipantsMap,
        [channelId]: participants,
      },
    }));
  },
}));
