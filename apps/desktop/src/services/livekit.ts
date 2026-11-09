import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Track,
  createLocalAudioTrack,
  type RemoteTrack,
} from 'livekit-client';
import type { VoiceParticipant } from '../types';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_WS_URL || 'ws://localhost:7880';

class LiveKitService {
  private room: Room | null = null;
  private isMuted: boolean = false;
  private isCameraOn: boolean = false;
  private isScreenSharing: boolean = false;

  public async joinRoom(
    token: string,
    onParticipantsUpdate: (participants: VoiceParticipant[]) => void
  ): Promise<Room> {
    if (this.room) {
      await this.leaveRoom();
    }

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.setupRoomEvents(this.room, onParticipantsUpdate);

    await this.room.connect(LIVEKIT_URL, token);

    // Auto-publish local microphone
    try {
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
      });
      await this.room.localParticipant.publishTrack(audioTrack);
    } catch (err) {
      console.warn('[LiveKit] Microphone not available or denied:', err);
    }

    this.notifyParticipants(onParticipantsUpdate);
    return this.room;
  }

  public async leaveRoom(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }
    this.isMuted = false;
    this.isCameraOn = false;
    this.isScreenSharing = false;
  }

  public async toggleMute(): Promise<boolean> {
    if (!this.room) return false;
    this.isMuted = !this.isMuted;
    await this.room.localParticipant.setMicrophoneEnabled(!this.isMuted);
    return this.isMuted;
  }

  public async toggleCamera(): Promise<boolean> {
    if (!this.room) return false;
    this.isCameraOn = !this.isCameraOn;
    try {
      await this.room.localParticipant.setCameraEnabled(this.isCameraOn);
    } catch (err) {
      console.error('[LiveKit] Failed to toggle camera:', err);
      this.isCameraOn = false;
    }
    return this.isCameraOn;
  }

  public async toggleScreenShare(): Promise<boolean> {
    if (!this.room) return false;
    this.isScreenSharing = !this.isScreenSharing;
    try {
      await this.room.localParticipant.setScreenShareEnabled(this.isScreenSharing);
    } catch (err) {
      console.error('[LiveKit] Failed to toggle screen share:', err);
      this.isScreenSharing = false;
    }
    return this.isScreenSharing;
  }

  private setupRoomEvents(
    room: Room,
    onParticipantsUpdate: (participants: VoiceParticipant[]) => void
  ): void {
    const update = () => this.notifyParticipants(onParticipantsUpdate);

    room
      .on(RoomEvent.ParticipantConnected, update)
      .on(RoomEvent.ParticipantDisconnected, update)
      .on(RoomEvent.ActiveSpeakersChanged, update)
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          track.attach();
        }
        update();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
        update();
      })
      .on(RoomEvent.LocalTrackPublished, update)
      .on(RoomEvent.LocalTrackUnpublished, update);
  }

  public attachParticipantVideo(identity: string, videoElement: HTMLVideoElement): void {
    if (!this.room) return;

    if (identity === this.room.localParticipant.identity) {
      const pub = Array.from(this.room.localParticipant.videoTrackPublications.values())[0];
      if (pub && pub.track) {
        pub.track.attach(videoElement);
      }
    } else {
      const remote = this.room.remoteParticipants.get(identity);
      if (remote) {
        const pub = Array.from(remote.videoTrackPublications.values())[0];
        if (pub && pub.track) {
          pub.track.attach(videoElement);
        }
      }
    }
  }

  private notifyParticipants(
    callback: (participants: VoiceParticipant[]) => void
  ): void {
    if (!this.room) {
      callback([]);
      return;
    }

    const participants: VoiceParticipant[] = [];

    // Local participant
    const local = this.room.localParticipant;
    const localVideoTrack = Array.from(local.videoTrackPublications.values())[0]?.track?.mediaStreamTrack;

    participants.push({
      identity: local.identity,
      name: local.name || 'You',
      isSpeaking: local.isSpeaking,
      isMuted: !local.isMicrophoneEnabled,
      isCameraOn: local.isCameraEnabled,
      isScreenSharing: local.isScreenShareEnabled,
      isLocal: true,
      videoTrack: localVideoTrack,
    });

    // Remote participants
    this.room.remoteParticipants.forEach((remote: RemoteParticipant) => {
      const remoteVideoTrack = Array.from(remote.videoTrackPublications.values())[0]?.track?.mediaStreamTrack;

      participants.push({
        identity: remote.identity,
        name: remote.name || remote.identity,
        isSpeaking: remote.isSpeaking,
        isMuted: !remote.isMicrophoneEnabled,
        isCameraOn: remote.isCameraEnabled,
        isScreenSharing: remote.isScreenShareEnabled,
        isLocal: false,
        videoTrack: remoteVideoTrack,
      });
    });

    callback(participants);
  }
}

export const liveKitService = new LiveKitService();
