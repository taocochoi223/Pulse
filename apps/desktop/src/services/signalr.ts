import * as signalR from '@microsoft/signalr';
import type { Message, VoiceParticipant } from '../types';

const getDefaultHubUrl = (): string => {
  const envHub = import.meta.env.VITE_HUB_URL;
  if (envHub && !envHub.includes('localhost')) {
    return envHub;
  }
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5000/hubs/chat`;
  }
  return envHub || 'http://localhost:5000/hubs/chat';
};

const HUB_URL = getDefaultHubUrl();

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentChannelId: string | null = null;
  private connectPromise: Promise<void> | null = null;

  public async connect(): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const token =
      typeof localStorage !== 'undefined' ? localStorage.getItem('pulse_access_token') : null;
    if (!token) return;

    this.connectPromise = (async () => {
      try {
        if (this.connection) {
          await this.connection.stop().catch(() => {});
        }

        this.connection = new signalR.HubConnectionBuilder()
          .withUrl(HUB_URL, {
            accessTokenFactory: () => localStorage.getItem('pulse_access_token') || '',
          })
          .withAutomaticReconnect([0, 1500, 3000, 5000, 10000])
          .configureLogging(signalR.LogLevel.Warning)
          .build();

        this.setupListeners();

        this.connection.onreconnected(async () => {
          if (this.currentChannelId) {
            await this.joinChannel(this.currentChannelId);
          }
        });

        await this.connection.start();
        console.log('[SignalR] Connected successfully.');
        if (this.currentChannelId) {
          await this.joinChannel(this.currentChannelId);
        }
      } catch (err) {
        console.warn('[SignalR] Connection warning:', err);
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  public getConnectionId(): string | null {
    return this.connection?.connectionId ?? null;
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop().catch(() => {});
      this.connection = null;
    }
  }

  public async joinChannel(channelId: string): Promise<void> {
    this.currentChannelId = channelId;
    await this.ensureConnected();
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinChannel', channelId);
      } catch (err) {
        console.warn(`[SignalR] Failed to join channel ${channelId}:`, err);
      }
    }
  }

  public async leaveChannel(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveChannel', channelId);
      } catch (err) {
        console.warn(`[SignalR] Failed to leave channel ${channelId}:`, err);
      }
    }
  }

  public async sendTyping(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('UserTyping', channelId);
      } catch {
        // Ignore transient typing errors
      }
    }
  }

  public async joinVoiceChannel(
    channelId: string,
    displayName: string,
    avatarUrl?: string | null
  ): Promise<VoiceParticipant[]> {
    await this.ensureConnected();
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        const list = await this.connection.invoke<VoiceParticipant[]>(
          'JoinVoiceChannel',
          channelId,
          displayName,
          avatarUrl || null
        );
        return list || [];
      } catch (err) {
        console.warn('[SignalR] JoinVoiceChannel failed:', err);
      }
    }
    return [];
  }

  public async leaveVoiceChannel(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveVoiceChannel', channelId);
      } catch (err) {
        console.warn('[SignalR] LeaveVoiceChannel failed:', err);
      }
    }
  }

  public async updateVoiceState(
    channelId: string,
    isMuted: boolean,
    isDeafened: boolean,
    isCameraOn: boolean,
    isScreenSharing: boolean,
    isSpeaking: boolean
  ): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke(
          'UpdateVoiceState',
          channelId,
          isMuted,
          isDeafened,
          isCameraOn,
          isScreenSharing,
          isSpeaking
        );
      } catch {
        // Ignore
      }
    }
  }

  public async sendWebRtcSignal(targetConnectionId: string, signalData: any): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('SendWebRtcSignal', targetConnectionId, signalData);
      } catch (err) {
        console.warn('[SignalR] SendWebRtcSignal failed:', err);
      }
    }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.connection || this.connection.state === signalR.HubConnectionState.Disconnected) {
      await this.connect();
    } else if (this.connectPromise) {
      await this.connectPromise;
    }
  }

  private setupListeners(): void {
    if (!this.connection) return;

    this.connection.on('MessageReceived', (message: Message) => {
      window.dispatchEvent(new CustomEvent('pulse_message_received', { detail: message }));
    });

    this.connection.on('MessageUpdated', (message: Message) => {
      window.dispatchEvent(new CustomEvent('pulse_message_updated', { detail: message }));
    });

    this.connection.on('MessageDeleted', (data: { channelId: string; messageId: string }) => {
      window.dispatchEvent(new CustomEvent('pulse_message_deleted', { detail: data }));
    });

    this.connection.on('UserTyping', (data: { channelId: string; userId: string; username: string }) => {
      window.dispatchEvent(new CustomEvent('pulse_user_typing', { detail: data }));
    });

    this.connection.on('UserPresenceChanged', (data: { userId: string; status: number }) => {
      window.dispatchEvent(new CustomEvent('pulse_presence_changed', { detail: data }));
    });

    this.connection.on(
      'VoiceParticipantsUpdated',
      (data: { channelId: string; participants: VoiceParticipant[] }) => {
        window.dispatchEvent(new CustomEvent('pulse_voice_participants_updated', { detail: data }));
      }
    );

    this.connection.on('VoicePeerJoined', (peer: VoiceParticipant) => {
      window.dispatchEvent(new CustomEvent('pulse_voice_peer_joined', { detail: peer }));
    });

    this.connection.on('VoicePeerLeft', (data: { connectionId: string; identity: string }) => {
      window.dispatchEvent(new CustomEvent('pulse_voice_peer_left', { detail: data }));
    });

    this.connection.on(
      'ReceiveWebRtcSignal',
      (data: { fromConnectionId: string; fromIdentity: string; signal: any }) => {
        window.dispatchEvent(new CustomEvent('pulse_webrtc_signal', { detail: data }));
      }
    );
  }
}

export const signalRService = new SignalRService();
