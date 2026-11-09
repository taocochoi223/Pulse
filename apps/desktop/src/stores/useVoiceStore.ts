import { create } from 'zustand';
import type { Channel, VoiceParticipant } from '../types';
import { liveKitService } from '../services/livekit';
import { apiClient } from '../services/api';

interface VoiceState {
  activeVoiceChannel: Channel | null;
  isConnected: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  participants: VoiceParticipant[];
  joinVoiceRoom: (channel: Channel) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeVoiceChannel: null,
  isConnected: false,
  isMuted: false,
  isCameraOn: false,
  isScreenSharing: false,
  participants: [],

  joinVoiceRoom: async (channel: Channel) => {
    if (get().activeVoiceChannel?.id === channel.id) return;

    if (get().isConnected) {
      await get().leaveVoiceRoom();
    }

    try {
      const roomName = `room-${channel.id}`;
      const { data } = await apiClient.get<{ token: string }>(
        `/media/livekit-token?roomName=${encodeURIComponent(roomName)}`
      );

      await liveKitService.joinRoom(data.token, (participants) => {
        set({ participants });
      });

      set({
        activeVoiceChannel: channel,
        isConnected: true,
        isMuted: false,
        isScreenSharing: false,
      });
    } catch (err) {
      console.error('Failed to join voice room:', err);
    }
  },

  leaveVoiceRoom: async () => {
    await liveKitService.leaveRoom();
    set({
      activeVoiceChannel: null,
      isConnected: false,
      participants: [],
      isMuted: false,
      isScreenSharing: false,
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
}));

