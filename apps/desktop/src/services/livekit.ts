import type { VoiceParticipant } from '../types';
import { signalRService } from './signalr';
import { soundEffects } from './soundEffects';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

interface PeerSession {
  pc: RTCPeerConnection;
  connectionId: string;
  identity: string;
  audioEl?: HTMLAudioElement;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
}

class LiveKitVoiceService {
  // Local WebRTC media state
  private currentChannelId: string | null = null;
  private localMicStream: MediaStream | null = null;
  private localCameraStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private speakingInterval: number | null = null;

  private isMuted = false;
  private isDeafened = false;
  private wasMutedBeforeDeafen = false;
  private isCameraOn = false;
  private isScreenSharing = false;
  private isSpeaking = false;

  private peerSessions = new Map<string, PeerSession>();
  private serverParticipants: VoiceParticipant[] = [];
  private onParticipantsChangeCallback: ((participants: VoiceParticipant[]) => void) | null = null;

  private boundOnPeerJoined: (e: Event) => void;
  private boundOnPeerLeft: (e: Event) => void;
  private boundOnWebRtcSignal: (e: Event) => void;
  private boundOnParticipantsUpdated: (e: Event) => void;

  constructor() {
    this.boundOnPeerJoined = (e: Event) => {
      const peer = (e as CustomEvent<VoiceParticipant>).detail;
      if (peer?.connectionId) {
        soundEffects.playJoinRoom();
        this.initiatePeerConnection(peer.connectionId, peer.identity, true);
      }
    };

    this.boundOnPeerLeft = (e: Event) => {
      const data = (e as CustomEvent<{ connectionId: string; identity: string }>).detail;
      if (data?.connectionId) {
        soundEffects.playLeaveRoom();
        this.closePeerConnection(data.connectionId);
        this.emitParticipants();
      }
    };

    this.boundOnWebRtcSignal = (e: Event) => {
      const data = (
        e as CustomEvent<{ fromConnectionId: string; fromIdentity: string; signal: any }>
      ).detail;
      if (data?.fromConnectionId && data?.signal) {
        this.handleWebRtcSignal(data.fromConnectionId, data.fromIdentity, data.signal);
      }
    };

    this.boundOnParticipantsUpdated = (e: Event) => {
      const data = (
        e as CustomEvent<{ channelId: string; participants: VoiceParticipant[] }>
      ).detail;
      if (data && data.channelId === this.currentChannelId) {
        this.serverParticipants = data.participants || [];
        this.emitParticipants();
      }
    };
  }

  public async joinRoom(
    channelId: string,
    displayName: string,
    avatarUrl: string | null | undefined,
    onParticipantsUpdate: (participants: VoiceParticipant[]) => void
  ): Promise<void> {
    if (this.currentChannelId) {
      await this.leaveRoom(true);
    }

    this.currentChannelId = channelId;
    this.onParticipantsChangeCallback = onParticipantsUpdate;
    this.isMuted = false;
    this.isDeafened = false;
    this.wasMutedBeforeDeafen = false;
    this.isCameraOn = false;
    this.isScreenSharing = false;
    this.isSpeaking = false;

    window.addEventListener('pulse_voice_peer_joined', this.boundOnPeerJoined);
    window.addEventListener('pulse_voice_peer_left', this.boundOnPeerLeft);
    window.addEventListener('pulse_webrtc_signal', this.boundOnWebRtcSignal);
    window.addEventListener('pulse_voice_participants_updated', this.boundOnParticipantsUpdated);

    // Phát âm thanh chuẩn khi vào phòng họp
    soundEffects.playJoinRoom();

    // 1. Acquire local microphone if available
    try {
      this.localMicStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      this.setupVoiceActivityDetection(this.localMicStream);
    } catch (err) {
      console.warn('[VoiceEngine] Microphone unavailable or permission denied, joining in listen mode:', err);
      this.isMuted = true;
    }

    // 2. Join SignalR voice channel and get initial participant list
    const initialParticipants = await signalRService.joinVoiceChannel(
      channelId,
      displayName,
      avatarUrl
    );
    this.serverParticipants = initialParticipants;

    if (this.isMuted) {
      await this.syncLocalStateToServer();
    }

    this.emitParticipants();
  }

  public async leaveRoom(silent = false): Promise<void> {
    window.removeEventListener('pulse_voice_peer_joined', this.boundOnPeerJoined);
    window.removeEventListener('pulse_voice_peer_left', this.boundOnPeerLeft);
    window.removeEventListener('pulse_webrtc_signal', this.boundOnWebRtcSignal);
    window.removeEventListener('pulse_voice_participants_updated', this.boundOnParticipantsUpdated);

    if (this.currentChannelId) {
      if (!silent) {
        soundEffects.playLeaveRoom();
      }
      await signalRService.leaveVoiceChannel(this.currentChannelId);
      this.currentChannelId = null;
    }

    for (const connectionId of Array.from(this.peerSessions.keys())) {
      this.closePeerConnection(connectionId);
    }
    this.peerSessions.clear();

    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }
    if (this.audioContext) {
      await this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.localMicStream?.getTracks().forEach((t) => t.stop());
    this.localCameraStream?.getTracks().forEach((t) => t.stop());
    this.localScreenStream?.getTracks().forEach((t) => t.stop());

    this.localMicStream = null;
    this.localCameraStream = null;
    this.localScreenStream = null;
    this.isDeafened = false;
    this.serverParticipants = [];
    this.onParticipantsChangeCallback = null;
  }

  public async toggleMute(): Promise<boolean> {
    if (!this.localMicStream) {
      try {
        this.localMicStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        this.setupVoiceActivityDetection(this.localMicStream);
        this.isMuted = false;
        await this.replaceOutgoingTracks();
      } catch {
        this.isMuted = true;
      }
    } else {
      this.isMuted = !this.isMuted;
      this.localMicStream.getAudioTracks().forEach((t) => {
        t.enabled = !this.isMuted;
      });
      if (this.isMuted) {
        this.isSpeaking = false;
      }
    }

    // Nếu người dùng bật lại Mic khi đang tắt loa (Deafen), tự động bật lại loa
    if (!this.isMuted && this.isDeafened) {
      this.isDeafened = false;
      this.applyDeafenToRemoteAudio(false);
    }

    if (this.isMuted) {
      soundEffects.playMute();
    } else {
      soundEffects.playUnmute();
    }

    await this.syncLocalStateToServer();
    this.emitParticipants();
    return this.isMuted;
  }

  public async toggleDeafen(): Promise<{ isDeafened: boolean; isMuted: boolean }> {
    this.isDeafened = !this.isDeafened;
    this.applyDeafenToRemoteAudio(this.isDeafened);

    if (this.isDeafened) {
      this.wasMutedBeforeDeafen = this.isMuted;
      if (!this.isMuted) {
        this.isMuted = true;
        this.isSpeaking = false;
        this.localMicStream?.getAudioTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      soundEffects.playDeafen();
    } else {
      if (!this.wasMutedBeforeDeafen && this.localMicStream) {
        this.isMuted = false;
        this.localMicStream.getAudioTracks().forEach((t) => {
          t.enabled = true;
        });
      }
      soundEffects.playUndeafen();
    }

    await this.syncLocalStateToServer();
    this.emitParticipants();
    return { isDeafened: this.isDeafened, isMuted: this.isMuted };
  }

  private applyDeafenToRemoteAudio(deafened: boolean): void {
    for (const session of this.peerSessions.values()) {
      if (session.audioEl) {
        session.audioEl.muted = deafened;
      }
    }
  }

  public async toggleCamera(): Promise<boolean> {
    if (this.isCameraOn) {
      this.localCameraStream?.getTracks().forEach((t) => t.stop());
      this.localCameraStream = null;
      this.isCameraOn = false;
      soundEffects.playStreamOff();
    } else {
      try {
        this.localCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        this.isCameraOn = true;
        soundEffects.playStreamOn();
      } catch (err) {
        console.error('[VoiceEngine] Failed to start camera:', err);
        this.isCameraOn = false;
      }
    }

    await this.replaceOutgoingTracks();
    await this.syncLocalStateToServer();
    this.emitParticipants();
    return this.isCameraOn;
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (this.isScreenSharing) {
      this.localScreenStream?.getTracks().forEach((t) => t.stop());
      this.localScreenStream = null;
      this.isScreenSharing = false;
      soundEffects.playStreamOff();
    } else {
      try {
        this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: true,
        });
        const videoTrack = this.localScreenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = async () => {
            this.isScreenSharing = false;
            this.localScreenStream = null;
            soundEffects.playStreamOff();
            await this.replaceOutgoingTracks();
            await this.syncLocalStateToServer();
            this.emitParticipants();
          };
        }
        this.isScreenSharing = true;
        soundEffects.playStreamOn();
      } catch (err) {
        console.warn('[VoiceEngine] Screen share cancelled or denied:', err);
        this.isScreenSharing = false;
      }
    }

    await this.replaceOutgoingTracks();
    await this.syncLocalStateToServer();
    this.emitParticipants();
    return this.isScreenSharing;
  }

  public async switchAudioDevice(deviceId: string): Promise<void> {
    try {
      this.localMicStream?.getTracks().forEach((t) => t.stop());
      this.localMicStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      this.localMicStream.getAudioTracks().forEach((t) => {
        t.enabled = !this.isMuted;
      });
      this.setupVoiceActivityDetection(this.localMicStream);
      await this.replaceOutgoingTracks();
      this.emitParticipants();
    } catch (err) {
      console.warn('[VoiceEngine] Failed to switch audio device:', err);
    }
  }

  public async switchVideoDevice(deviceId: string): Promise<void> {
    if (!this.isCameraOn) return;
    try {
      this.localCameraStream?.getTracks().forEach((t) => t.stop());
      this.localCameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      await this.replaceOutgoingTracks();
      this.emitParticipants();
    } catch (err) {
      console.warn('[VoiceEngine] Failed to switch video device:', err);
    }
  }

  // =====================================================================
  // WEBRTC P2P MESH ENGINE
  // =====================================================================

  private getActiveLocalVideoTrack(): MediaStreamTrack | undefined {
    return (
      this.localScreenStream?.getVideoTracks()[0] ||
      this.localCameraStream?.getVideoTracks()[0]
    );
  }

  private getActiveLocalAudioTrack(): MediaStreamTrack | undefined {
    return this.localMicStream?.getAudioTracks()[0];
  }

  private async initiatePeerConnection(
    remoteConnectionId: string,
    remoteIdentity: string,
    isOfferer: boolean
  ): Promise<PeerSession> {
    const existing = this.peerSessions.get(remoteConnectionId);
    if (existing) return existing;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const session: PeerSession = {
      pc,
      connectionId: remoteConnectionId,
      identity: remoteIdentity,
    };
    this.peerSessions.set(remoteConnectionId, session);

    // Add local tracks
    const audioTrack = this.getActiveLocalAudioTrack();
    const videoTrack = this.getActiveLocalVideoTrack();
    const stream = new MediaStream();

    if (audioTrack) {
      stream.addTrack(audioTrack);
      pc.addTrack(audioTrack, stream);
    }
    if (videoTrack) {
      stream.addTrack(videoTrack);
      pc.addTrack(videoTrack, stream);
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signalRService.sendWebRtcSignal(remoteConnectionId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const track = event.track;
      if (track.kind === 'audio') {
        session.audioTrack = track;
        const audio = new Audio();
        audio.srcObject = new MediaStream([track]);
        audio.autoplay = true;
        audio.muted = this.isDeafened;
        audio.play().catch(() => {});
        session.audioEl = audio;
      } else if (track.kind === 'video') {
        session.videoTrack = track;
        track.onended = () => {
          session.videoTrack = undefined;
          this.emitParticipants();
        };
      }
      this.emitParticipants();
    };

    if (isOfferer) {
      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await signalRService.sendWebRtcSignal(remoteConnectionId, {
          type: 'offer',
          sdp: pc.localDescription,
        });
      } catch (err) {
        console.warn('[WebRTC] Failed to create offer:', err);
      }
    }

    return session;
  }

  private async handleWebRtcSignal(
    fromConnectionId: string,
    fromIdentity: string,
    signal: any
  ): Promise<void> {
    try {
      const session = await this.initiatePeerConnection(fromConnectionId, fromIdentity, false);
      const { pc } = session;

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signalRService.sendWebRtcSignal(fromConnectionId, {
          type: 'answer',
          sdp: pc.localDescription,
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else if (signal.type === 'ice-candidate' && signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (err) {
      console.warn('[WebRTC] Signal handling error:', err);
    }
  }

  private async replaceOutgoingTracks(): Promise<void> {
    const newVideoTrack = this.getActiveLocalVideoTrack() || null;
    const newAudioTrack = this.getActiveLocalAudioTrack() || null;

    for (const [remoteConnId, session] of this.peerSessions.entries()) {
      const { pc } = session;
      const senders = pc.getSenders();

      const audioSender = senders.find((s) => s.track?.kind === 'audio');
      if (audioSender && newAudioTrack) {
        await audioSender.replaceTrack(newAudioTrack).catch(() => {});
      } else if (!audioSender && newAudioTrack) {
        pc.addTrack(newAudioTrack, new MediaStream([newAudioTrack]));
      }

      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack).catch(() => {});
      } else if (newVideoTrack) {
        pc.addTrack(newVideoTrack, new MediaStream([newVideoTrack]));
      }

      // Renegotiate if needed
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signalRService.sendWebRtcSignal(remoteConnId, {
          type: 'offer',
          sdp: pc.localDescription,
        });
      } catch {
        // Ignore renegotiation race
      }
    }
  }

  private closePeerConnection(connectionId: string): void {
    const session = this.peerSessions.get(connectionId);
    if (!session) return;
    if (session.audioEl) {
      session.audioEl.pause();
      session.audioEl.srcObject = null;
    }
    session.pc.close();
    this.peerSessions.delete(connectionId);
  }

  private setupVoiceActivityDetection(stream: MediaStream): void {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      this.speakingInterval = window.setInterval(() => {
        if (this.isMuted) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.syncLocalStateToServer();
            this.emitParticipants();
          }
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const speakingNow = avg > 16;
        if (speakingNow !== this.isSpeaking) {
          this.isSpeaking = speakingNow;
          this.syncLocalStateToServer();
          this.emitParticipants();
        }
      }, 180);
    } catch {
      // Ignore if AudioContext is restricted
    }
  }

  private async syncLocalStateToServer(): Promise<void> {
    if (!this.currentChannelId) return;
    await signalRService.updateVoiceState(
      this.currentChannelId,
      this.isMuted,
      this.isDeafened,
      this.isCameraOn,
      this.isScreenSharing,
      this.isSpeaking
    );
  }

  private emitParticipants(): void {
    if (!this.onParticipantsChangeCallback) return;

    const myConnectionId = signalRService.getConnectionId();
    const localVideoTrack = this.getActiveLocalVideoTrack();
    const localAudioTrack = this.getActiveLocalAudioTrack();

    if (this.serverParticipants.length === 0) {
      this.onParticipantsChangeCallback([
        {
          identity: 'local-user',
          name: 'You',
          isSpeaking: this.isSpeaking,
          isMuted: this.isMuted,
          isCameraOn: this.isCameraOn,
          isScreenSharing: this.isScreenSharing,
          isLocal: true,
          audioTrack: localAudioTrack,
          videoTrack: localVideoTrack,
        },
      ]);
      return;
    }

    const merged: VoiceParticipant[] = this.serverParticipants.map((p) => {
      const isMe =
        (myConnectionId && p.connectionId === myConnectionId) || p.isLocal === true;

      if (isMe) {
        return {
          ...p,
          isLocal: true,
          isSpeaking: this.isSpeaking,
          isMuted: this.isMuted,
          isCameraOn: this.isCameraOn,
          isScreenSharing: this.isScreenSharing,
          audioTrack: localAudioTrack,
          videoTrack: localVideoTrack,
        };
      }

      const peerSession = p.connectionId ? this.peerSessions.get(p.connectionId) : undefined;
      return {
        ...p,
        isLocal: false,
        audioTrack: peerSession?.audioTrack,
        videoTrack: peerSession?.videoTrack,
      };
    });

    this.onParticipantsChangeCallback(merged);
  }
}

export const liveKitService = new LiveKitVoiceService();
