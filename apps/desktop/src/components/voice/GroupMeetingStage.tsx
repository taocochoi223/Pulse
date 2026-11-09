import React, { useEffect, useRef, useState } from 'react';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { useServerStore } from '../../stores/useServerStore';
import { useMessageStore } from '../../stores/useMessageStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { VirtualizedMessageList } from '../chat/VirtualizedMessageList';
import { MessageInput } from '../chat/MessageInput';
import { AudioDeviceSelector } from './AudioDeviceSelector';
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  Radio,
  Volume2,
  MessageSquare,
  X,
} from 'lucide-react';
import type { Channel, VoiceParticipant } from '../../types';

interface GroupMeetingStageProps {
  channel: Channel;
}

export const formatCallDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const GroupMeetingStage: React.FC<GroupMeetingStageProps> = ({ channel }) => {
  const {
    isConnected,
    isMuted,
    isDeafened,
    isCameraOn,
    isScreenSharing,
    participants,
    roomStartedAtMap,
    joinVoiceRoom,
    leaveVoiceRoom,
    toggleMute,
    toggleDeafen,
    toggleCamera,
    toggleScreenShare,
    activeVoiceChannel,
  } = useVoiceStore();

  const { activeServer, setActiveChannel } = useServerStore();
  const { user } = useAuthStore();
  const {
    messages,
    fetchMessages,
    fetchMoreMessages,
    sendMessage,
    typingUsers,
    isLoadingMore,
    hasMore,
  } = useMessageStore();

  const [isMeetingChatOpen, setIsMeetingChatOpen] = useState(false);

  // Tự động tham gia phòng họp khi bấm vào kênh Voice (nếu chưa ở trong phòng này)
  useEffect(() => {
    if (!isConnected || activeVoiceChannel?.id !== channel.id) {
      joinVoiceRoom(channel);
    }
  }, [channel.id]);

  // Tải tin nhắn chat trong phòng họp khi mở ngăn chat
  useEffect(() => {
    if (isMeetingChatOpen) {
      fetchMessages(channel.id);
    }
  }, [isMeetingChatOpen, channel.id, fetchMessages]);

  // Tính thời gian cuộc họp từ lúc người đầu tiên vào phòng đến khi người cuối cùng rời phòng
  const startedAtMs = roomStartedAtMap[channel.id];
  const [callDuration, setCallDuration] = useState<number>(() =>
    startedAtMs ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)) : 0
  );

  useEffect(() => {
    const start = roomStartedAtMap[channel.id];
    if (!start) {
      setCallDuration(0);
      return;
    }

    const updateTimer = () => {
      setCallDuration(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [channel.id, roomStartedAtMap]);

  const handleLeaveMeeting = async () => {
    await leaveVoiceRoom();
    const firstTextChannel = activeServer?.channels?.find((c) => c.type === 1);
    if (firstTextChannel) {
      await setActiveChannel(firstTextChannel);
    }
  };

  // Hiển thị người tham gia
  const displayParticipants: VoiceParticipant[] =
    participants.length > 0
      ? participants
      : [
          {
            identity: user?.id || 'local-user',
            name: user?.displayName || 'Bạn',
            avatarUrl: user?.avatarUrl,
            isSpeaking: false,
            isMuted: isMuted,
            isCameraOn: isCameraOn,
            isScreenSharing: isScreenSharing,
            isLocal: true,
          },
        ];

  return (
    <div className="flex-1 flex h-full bg-[#0d0f15] select-none relative overflow-hidden">
      {/* Sân khấu chính */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* 1. Thanh tiêu đề Phòng họp */}
        <div className="h-14 border-b border-pulse-border/60 px-6 flex items-center justify-between shrink-0 bg-pulse-panel/40 backdrop-blur-sm z-10">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>PHÒNG HỌP TRỰC TIẾP</span>
            </div>

            <h2 className="text-white font-bold text-base flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-pulse-muted" />
              <span>{channel.name}</span>
            </h2>

            <div
              title="Thời gian cuộc họp (tính từ khi người đầu tiên vào phòng)"
              className="text-xs text-emerald-400 font-mono font-bold bg-pulse-card border border-emerald-500/30 px-2.5 py-0.5 rounded-md"
            >
              {formatCallDuration(callDuration)}
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs text-pulse-muted">
            <div className="flex items-center space-x-1.5 bg-pulse-card px-3 py-1.5 rounded-lg border border-pulse-border">
              <Users className="w-3.5 h-3.5 text-pulse-accent" />
              <span className="text-white font-medium">
                {displayParticipants.length} người tham gia
              </span>
            </div>
          </div>
        </div>

        {/* 2. Lưới Video / Avatar thành viên */}
        <div className="flex-1 p-4 md:p-6 pb-24 flex items-center justify-center overflow-y-auto">
          <div
            className={`w-full h-full max-h-[78vh] grid gap-4 transition-all ${
              displayParticipants.length === 1
                ? 'grid-cols-1 max-w-4xl'
                : displayParticipants.length === 2
                ? 'grid-cols-1 md:grid-cols-2 max-w-5xl'
                : displayParticipants.length <= 4
                ? 'grid-cols-2 max-w-5xl'
                : 'grid-cols-2 md:grid-cols-3 max-w-6xl'
            }`}
          >
            {displayParticipants.map((participant) => (
              <ParticipantTile
                key={participant.connectionId || participant.identity}
                participant={participant}
              />
            ))}
          </div>
        </div>

        {/* 3. Thanh điều khiển cuộc họp bên dưới */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-3 px-6 py-3 bg-pulse-panel/90 backdrop-blur-md border border-pulse-border rounded-2xl shadow-2xl z-20">
          {/* Bật/Tắt Micro */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40'
                : 'bg-pulse-hover text-white hover:bg-pulse-accent shadow-md'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Bật/Tắt Loa / Tai nghe (Deafen) */}
          <button
            onClick={toggleDeafen}
            title={isDeafened ? 'Bật Loa / Tai nghe' : 'Tắt Loa / Tai nghe (Deafen)'}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isDeafened
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/40'
                : 'bg-pulse-hover text-pulse-muted hover:text-white hover:bg-pulse-card border border-pulse-border'
            }`}
          >
            {isDeafened ? <HeadphoneOff className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </button>

          {/* Bật/Tắt Camera */}
          <button
            onClick={toggleCamera}
            title={isCameraOn ? 'Tắt Camera' : 'Bật Camera'}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isCameraOn
                ? 'bg-pulse-accent text-white shadow-lg shadow-pulse-accent/30'
                : 'bg-pulse-hover text-pulse-muted hover:text-white hover:bg-pulse-card border border-pulse-border'
            }`}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Chia sẻ màn hình */}
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Dừng Chia Sẻ Màn Hình' : 'Chia Sẻ Màn Hình'}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-pulse-hover text-pulse-muted hover:text-white hover:bg-pulse-card border border-pulse-border'
            }`}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* Mở khung Chat trong cuộc họp */}
          <button
            onClick={() => setIsMeetingChatOpen((prev) => !prev)}
            title="Mở Khung Trò Chuyện Trong Cuộc Họp"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isMeetingChatOpen
                ? 'bg-pulse-accent text-white shadow-lg shadow-pulse-accent/30'
                : 'bg-pulse-hover text-pulse-muted hover:text-white hover:bg-pulse-card border border-pulse-border'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Chọn thiết bị Micro & Camera */}
          <AudioDeviceSelector />

          <div className="w-[1px] h-6 bg-pulse-border mx-1" />

          {/* Rời phòng họp */}
          <button
            onClick={handleLeaveMeeting}
            title="Rời Phòng Họp"
            className="px-5 h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center space-x-2 transition-all shadow-lg shadow-rose-600/30"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-sm">Rời phòng</span>
          </button>
        </div>
      </div>

      {/* Ngăn kéo bên phải: Trò chuyện trong cuộc họp */}
      {isMeetingChatOpen && (
        <div className="w-80 md:w-96 border-l border-pulse-border bg-pulse-panel flex flex-col h-full shrink-0 z-20">
          <div className="h-14 border-b border-pulse-border px-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-pulse-accent" />
              <span className="font-bold text-sm text-white">Trò chuyện trong cuộc họp</span>
            </div>
            <button
              onClick={() => setIsMeetingChatOpen(false)}
              className="text-pulse-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <VirtualizedMessageList
            messages={messages}
            channelName={channel.name}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
            onLoadMore={() => fetchMoreMessages(channel.id)}
          />

          <MessageInput
            channelName={channel.name}
            channelId={channel.id}
            onSendMessage={(content, replyId, attachments) =>
              sendMessage(channel.id, content, replyId, attachments)
            }
            typingUsers={typingUsers}
          />
        </div>
      )}
    </div>
  );
};

interface ParticipantTileProps {
  participant: VoiceParticipant;
}

const ParticipantTile: React.FC<ParticipantTileProps> = ({ participant }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = !!participant.videoTrack && (participant.isCameraOn || participant.isScreenSharing || !participant.isLocal);

  useEffect(() => {
    const el = videoRef.current;
    if (el && participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      el.srcObject = stream;
      el.play().catch(() => {});
    } else if (el) {
      el.srcObject = null;
    }
  }, [participant.videoTrack, participant.isCameraOn, participant.isScreenSharing, hasVideo]);

  const initials = participant.name
    ? participant.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div
      className={`relative w-full h-full min-h-[220px] bg-pulse-card rounded-2xl overflow-hidden flex flex-col items-center justify-center border-2 transition-all duration-200 shadow-xl ${
        participant.isSpeaking
          ? 'border-emerald-500 shadow-emerald-500/20'
          : 'border-pulse-border/60 hover:border-pulse-border'
      }`}
    >
      {/* Luồng Video hoặc Ảnh đại diện */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover bg-black"
        />
      ) : (
        <div className="flex flex-col items-center justify-center p-6">
          {participant.avatarUrl ? (
            <img
              src={participant.avatarUrl}
              alt={participant.name}
              className={`w-24 h-24 md:w-28 md:h-28 rounded-full object-cover shadow-2xl transition-transform duration-200 ${
                participant.isSpeaking
                  ? 'scale-105 ring-4 ring-emerald-500 ring-offset-4 ring-offset-pulse-card'
                  : ''
              }`}
            />
          ) : (
            <div
              className={`w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-pulse-accent to-purple-600 flex items-center justify-center text-white font-bold text-3xl shadow-2xl transition-transform duration-200 ${
                participant.isSpeaking
                  ? 'scale-105 ring-4 ring-emerald-500 ring-offset-4 ring-offset-pulse-card'
                  : ''
              }`}
            >
              {initials}
            </div>
          )}
        </div>
      )}

      {/* Nhãn tên người tham gia */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center space-x-2 border border-white/10">
        <span className="truncate max-w-[150px]">{participant.name}</span>
        {participant.isLocal && <span className="text-emerald-400 text-[10px]">(Bạn)</span>}
      </div>

      {/* Nhãn trạng thái Mic / Màn hình */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5">
        {participant.isMuted && (
          <div className="p-1.5 bg-rose-500/90 text-white rounded-lg backdrop-blur-sm shadow-md">
            <MicOff className="w-3.5 h-3.5" />
          </div>
        )}
        {participant.isScreenSharing && (
          <div className="px-2 py-1 bg-indigo-600/90 text-white rounded-lg backdrop-blur-sm shadow-md flex items-center space-x-1 text-[10px] font-bold">
            <Monitor className="w-3.5 h-3.5" />
            <span>Màn hình</span>
          </div>
        )}
      </div>
    </div>
  );
};
