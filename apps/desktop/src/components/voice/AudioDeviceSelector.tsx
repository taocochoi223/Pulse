import React, { useEffect, useState } from 'react';
import { Sliders, Mic, Video, X, Check } from 'lucide-react';
import { liveKitService } from '../../services/livekit';

export const AudioDeviceSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [videoInputs, setVideoInputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  const loadDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics = devices.filter((d) => d.kind === 'audioinput');
      const cams = devices.filter((d) => d.kind === 'videoinput');
      setAudioInputs(mics);
      setVideoInputs(cams);

      if (!selectedAudioId && mics.length > 0) {
        setSelectedAudioId(mics[0].deviceId);
      }
      if (!selectedVideoId && cams.length > 0) {
        setSelectedVideoId(cams[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate media devices:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const handleSelectAudio = async (deviceId: string) => {
    setSelectedAudioId(deviceId);
    await liveKitService.switchAudioDevice(deviceId);
  };

  const handleSelectVideo = async (deviceId: string) => {
    setSelectedVideoId(deviceId);
    await liveKitService.switchVideoDevice(deviceId);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Cấu hình Thiết bị Âm thanh & Camera"
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-pulse-accent text-white shadow-lg shadow-pulse-accent/30'
            : 'bg-pulse-hover text-pulse-muted hover:text-white hover:bg-pulse-card border border-pulse-border'
        }`}
      >
        <Sliders className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-80 bg-pulse-panel border border-pulse-border rounded-2xl p-4 shadow-2xl z-30 space-y-4">
          <div className="flex items-center justify-between border-b border-pulse-border pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Thiết Bị Họp Nhóm
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-pulse-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Microphone Selector */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-pulse-muted mb-1.5">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              <span>Microphone (Đầu vào âm thanh)</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {audioInputs.length === 0 ? (
                <div className="text-xs text-pulse-muted italic px-2 py-1">
                  Không tìm thấy Microphone
                </div>
              ) : (
                audioInputs.map((mic, idx) => {
                  const active = selectedAudioId === mic.deviceId;
                  return (
                    <button
                      key={mic.deviceId || idx}
                      type="button"
                      onClick={() => handleSelectAudio(mic.deviceId)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                        active
                          ? 'bg-pulse-accent/20 text-white font-semibold border border-pulse-accent/40'
                          : 'text-pulse-text hover:bg-pulse-hover'
                      }`}
                    >
                      <span className="truncate pr-2">
                        {mic.label || `Microphone ${idx + 1}`}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Camera Selector */}
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-pulse-muted mb-1.5">
              <Video className="w-3.5 h-3.5 text-pulse-accent" />
              <span>Camera (Thiết bị hình ảnh)</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {videoInputs.length === 0 ? (
                <div className="text-xs text-pulse-muted italic px-2 py-1">
                  Không tìm thấy Camera
                </div>
              ) : (
                videoInputs.map((cam, idx) => {
                  const active = selectedVideoId === cam.deviceId;
                  return (
                    <button
                      key={cam.deviceId || idx}
                      type="button"
                      onClick={() => handleSelectVideo(cam.deviceId)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                        active
                          ? 'bg-pulse-accent/20 text-white font-semibold border border-pulse-accent/40'
                          : 'text-pulse-text hover:bg-pulse-hover'
                      }`}
                    >
                      <span className="truncate pr-2">
                        {cam.label || `Camera ${idx + 1}`}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
