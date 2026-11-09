import React from 'react';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { Mic, MicOff, Monitor, PhoneOff, Signal } from 'lucide-react';

export const VoiceFooter: React.FC = () => {
  const {
    activeVoiceChannel,
    isConnected,
    isMuted,
    isScreenSharing,
    toggleMute,
    toggleScreenShare,
    leaveVoiceRoom,
  } = useVoiceStore();

  if (!isConnected || !activeVoiceChannel) return null;

  return (
    <div className="bg-pulse-bg border-t border-pulse-border p-3 flex flex-col space-y-2 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="text-emerald-400 animate-pulse">
            <Signal className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-400">Voice Connected</div>
            <div className="text-xs text-pulse-muted truncate max-w-[130px]">
              {activeVoiceChannel.name}
            </div>
          </div>
        </div>

        <button
          onClick={leaveVoiceRoom}
          title="Disconnect Voice"
          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
        >
          <PhoneOff className="w-4 h-4" />
        </button>
      </div>

      {/* Voice Controls */}
      <div className="flex items-center justify-between pt-1 border-t border-pulse-border/50">
        <button
          onClick={toggleMute}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
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
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Your Screen'}
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

