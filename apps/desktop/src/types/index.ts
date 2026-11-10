export type UserStatus = 'Offline' | 'Online' | 'Idle' | 'DoNotDisturb' | 0 | 1 | 2 | 3;

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  status: UserStatus;
  customStatus?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
}

export type ChannelType = 1 | 2; // 1 = Text, 2 = Voice

export interface Channel {
  id: string;
  serverId: string;
  name: string;
  topic?: string | null;
  type: ChannelType;
  position: number;
  createdAt: string;
  unreadCount?: number;
}

export interface Member {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  status: UserStatus;
  customStatus?: string | null;
  isOwner: boolean;
  joinedAt: string;
}

export interface Server {
  id: string;
  name: string;
  description?: string | null;
  iconUrl?: string | null;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  channels?: Channel[];
  members?: Member[];
}

export interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface AttachmentInput {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  fileUrl: string;
  width?: number | null;
  height?: number | null;
}

export type MessageType = 1 | 2 | 3; // 1 = Default, 2 = Reply, 3 = System

export interface Message {
  id: string;
  channelId: string;
  sender: User;
  content: string;
  type: MessageType;
  replyToMessageId?: string | null;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt?: string | null;
  attachments: Attachment[];
  isMentioned?: boolean;
}

export interface ChannelMessagesResponse {
  messages: Message[];
  nextCursor?: string | null;
  hasMore: boolean;
}

export interface VoiceParticipant {
  identity: string;
  connectionId?: string;
  name: string;
  avatarUrl?: string | null;
  isSpeaking: boolean;
  isMuted: boolean;
  isDeafened?: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isLocal?: boolean;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
}
