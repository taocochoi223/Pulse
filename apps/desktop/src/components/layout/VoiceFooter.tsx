import React, { useEffect, useState } from 'react';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { useServerStore } from '../../stores/useServerStore';
import { formatCallDuration } from '../voice/GroupMeetingStage';
import { Mic, MicOff, Monitor, PhoneOff, Signal } from 'lucide-react';

export const VoiceFooter: React.FC = () => {
  const {
    activeVoiceChannel,
    isConnected,
    isMuted,
    isScreenSharing,
    roomStartedAtMap,
    toggleMute,
    toggleScreenShare,
    leaveVoiceRoom,
  } = useVoiceStore();

  const { setActiveChannel } = useServerStore();

  const startedAtMs = activeVoiceChannel ? roomStartedAtMap[activeVoiceChannel.id] : undefined;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isConnected || !startedAtMs) {
      setElapsed(0);
      return;
    }
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isConnected, startedAtMs]);

  if (!isConnected || !activeVoiceChannel) return null;

  return (
    <div className="bg-pulse-bg border-t border-pulse-border p-3 flex flex-col space-y-2 select-none">
      <div className="flex items-center justify-between">
        <div
          onClick={() => setActiveChannel(activeVoiceChannel)}
          title="Bấm để quay lại màn hình phòng họp"
          className="flex items-center space-x-2 cursor-pointer group overflow-hidden"
        >
          <div className="text-emerald-400 animate-pulse shrink-0">
            <Signal className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-semibold text-emerald-400 group-hover:underline">
                Đang trong cuộc họp
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded">
                {formatCallDuration(elapsed)}
              </span>
            </div>
            <div className="text-xs text-pulse-muted truncate max-w-[140px]">
              {activeVoiceChannel.name}
            </div>
          </div>
        </div>

        <button
          onClick={leaveVoiceRoom}
          title="Rời phòng họp"
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition shrink-0"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>

      {/* Điều khiển âm thanh & màn hình */}
      <div className="flex items-center justify-between pt-1 border-t border-pulse-border/50">
        <button
          onClick={toggleMute}
          title={isMuted ? 'Bật Micro' : 'Tắt Micro'}
          className={`flex-1 py-1.5 flex justify-center rounded-lg text-xs font-medium transition ${
            isMuted
              ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
              : 'hover:bg-pulse-hover text-pulse-text'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
          className={`flex-1 py-1.5 flex justify-center rounded-lg text-xs font-medium transition ${
            isScreenSharing
              ? 'bg-pulse-accent text-white'
              : 'hover:bg-pulse-hover text-pulse-text'
          }`}
        >
          <Monitor className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
