import * as signalR from '@microsoft/signalr';
import type { Message } from '../types';

const HUB_URL = import.meta.env.VITE_HUB_URL || 'http://localhost:5000/hubs/chat';

class SignalRService {
  private connection: signalR.HubConnection | null = null;
  private currentChannelId: string | null = null;

  public async connect(): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const token = localStorage.getItem('pulse_access_token');
    if (!token) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => localStorage.getItem('pulse_access_token') || '',
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupListeners();

    try {
      await this.connection.start();
      console.log('[SignalR] Connected successfully.');
      if (this.currentChannelId) {
        await this.joinChannel(this.currentChannelId);
      }
    } catch (err) {
      console.error('[SignalR] Connection failed:', err);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  public async joinChannel(channelId: string): Promise<void> {
    this.currentChannelId = channelId;
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('JoinChannel', channelId);
      } catch (err) {
        console.error(`[SignalR] Failed to join channel ${channelId}:`, err);
      }
    }
  }

  public async leaveChannel(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('LeaveChannel', channelId);
      } catch (err) {
        console.error(`[SignalR] Failed to leave channel ${channelId}:`, err);
      }
    }
  }

  public async sendTyping(channelId: string): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.connection.invoke('UserTyping', channelId);
      } catch (err) {
        console.error('[SignalR] Failed to send typing indicator:', err);
      }
    }
  }

  private setupListeners(): void {
    if (!this.connection) return;

    this.connection.on('MessageReceived', (message: Message) => {
      window.dispatchEvent(new CustomEvent('pulse_message_received', { detail: message }));
    });

    this.connection.on('UserTyping', (data: { channelId: string; userId: string; username: string }) => {
      window.dispatchEvent(new CustomEvent('pulse_user_typing', { detail: data }));
    });

    this.connection.on('UserPresenceChanged', (data: { userId: string; status: number }) => {
      window.dispatchEvent(new CustomEvent('pulse_presence_changed', { detail: data }));
    });
  }
}

export const signalRService = new SignalRService();

