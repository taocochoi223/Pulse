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
  roomStartedAtMap: { [channelId: string]: number }; // channelId -> epoch ms of first participant
  joinVoiceRoom: (channel: Channel) => Promise<void>;
  leaveVoiceRoom: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  setChannelParticipants: (
    channelId: string,
    participants: VoiceParticipant[],
    startedAtIso?: string | null
  ) => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeVoiceChannel: null,
  isConnected: false,
  isMuted: false,
  isCameraOn: false,
  isScreenSharing: false,
  participants: [],
  channelParticipantsMap: {},
  roomStartedAtMap: {},

  joinVoiceRoom: async (channel: Channel) => {
    if (get().activeVoiceChannel?.id === channel.id && get().isConnected) return;

    if (get().isConnected) {
      await get().leaveVoiceRoom();
    }

    const user = useAuthStore.getState().user;
    const displayName = user?.displayName || user?.username || 'Thành viên';
    const avatarUrl = user?.avatarUrl;

    set((state) => ({
      activeVoiceChannel: channel,
      isConnected: true,
      isMuted: false,
      isCameraOn: false,
      isScreenSharing: false,
      roomStartedAtMap: {
        ...state.roomStartedAtMap,
        // Nếu phòng chưa có mốc bắt đầu thì lấy thời điểm người đầu tiên vào
        [channel.id]: state.roomStartedAtMap[channel.id] || Date.now(),
      },
    }));

    try {
      await liveKitService.joinRoom(channel.id, displayName, avatarUrl, (participants) => {
        set((state) => {
          const existingStart = state.roomStartedAtMap[channel.id] || Date.now();
          return {
            participants,
            channelParticipantsMap: {
              ...state.channelParticipantsMap,
              [channel.id]: participants,
            },
            roomStartedAtMap: {
              ...state.roomStartedAtMap,
              [channel.id]: existingStart,
            },
          };
        });
      });
    } catch (err) {
      console.error('Lỗi khi tham gia phòng họp:', err);
    }
  },

  leaveVoiceRoom: async () => {
    const oldChannelId = get().activeVoiceChannel?.id;
    await liveKitService.leaveRoom();
    set((state) => {
      const updatedMap = { ...state.channelParticipantsMap };
      const updatedStartMap = { ...state.roomStartedAtMap };
      if (oldChannelId) {
        const remaining = (updatedMap[oldChannelId] || []).filter((p) => !p.isLocal);
        if (remaining.length === 0) {
          delete updatedMap[oldChannelId];
          delete updatedStartMap[oldChannelId];
        } else {
          updatedMap[oldChannelId] = remaining;
        }
      }
      return {
        activeVoiceChannel: null,
        isConnected: false,
        participants: [],
        isMuted: false,
        isCameraOn: false,
        isScreenSharing: false,
        channelParticipantsMap: updatedMap,
        roomStartedAtMap: updatedStartMap,
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

  setChannelParticipants: (
    channelId: string,
    participants: VoiceParticipant[],
    startedAtIso?: string | null
  ) => {
    set((state) => {
      const updatedStartMap = { ...state.roomStartedAtMap };
      if (!participants || participants.length === 0) {
        // Khi người cuối cùng rời phòng họp -> xoá mốc thời gian
        delete updatedStartMap[channelId];
      } else if (startedAtIso) {
        const parsed = Date.parse(startedAtIso);
        if (!Number.isNaN(parsed)) {
          updatedStartMap[channelId] = parsed;
        }
      } else if (!updatedStartMap[channelId]) {
        updatedStartMap[channelId] = Date.now();
      }

      return {
        channelParticipantsMap: {
          ...state.channelParticipantsMap,
          [channelId]: participants,
        },
        roomStartedAtMap: updatedStartMap,
      };
    });
  },
}));
