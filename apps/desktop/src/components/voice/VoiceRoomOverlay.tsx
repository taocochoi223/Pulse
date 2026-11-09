import React from 'react';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { MicOff, Monitor, Volume2 } from 'lucide-react';

export const VoiceRoomOverlay: React.FC = () => {
  const { activeVoiceChannel, participants, isConnected } = useVoiceStore();

  if (!isConnected || !activeVoiceChannel) return null;

  return (
    <div className="bg-pulse-bg/95 border-b border-pulse-border p-4 flex flex-col space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          <h2 className="font-bold text-white text-base">{activeVoiceChannel.name}</h2>
          <span className="text-xs text-pulse-muted bg-pulse-card px-2 py-0.5 rounded-full">
            {participants.length} connected
          </span>
        </div>
      </div>

      {/* Participants Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {participants.map((p) => {
          const initials = p.name ? p.name[0].toUpperCase() : 'U';

          return (
            <div
              key={p.identity}
              className={`relative bg-pulse-card rounded-xl p-4 flex flex-col items-center justify-center border transition-all ${
                p.isSpeaking
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'border-pulse-border'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-14 h-14 rounded-full bg-pulse-panel flex items-center justify-center font-bold text-lg text-white mb-2 ${
                  p.isSpeaking ? 'ring-2 ring-emerald-500 animate-pulse' : ''
                }`}
              >
                {initials}
              </div>

              {/* Name */}
              <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                {p.name}
              </span>

              {/* Status Icons */}
              <div className="absolute top-2 right-2 flex space-x-1">
                {p.isMuted && (
                  <div className="p-1 bg-rose-500/20 text-rose-400 rounded-full">
                    <MicOff className="w-3 h-3" />
                  </div>
                )}
                {p.isScreenSharing && (
                  <div className="p-1 bg-pulse-accent/20 text-pulse-accent rounded-full">
                    <Monitor className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

