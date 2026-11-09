import React from 'react';
import { useServerStore } from '../../stores/useServerStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Crown } from 'lucide-react';
import type { Member, UserStatus } from '../../types';

const isMemberOnline = (status: UserStatus): boolean => {
  return status !== 0 && status !== 'Offline';
};

const getStatusColor = (status: UserStatus): string => {
  if (status === 2 || status === 'Idle') return 'bg-amber-400';
  if (status === 3 || status === 'DoNotDisturb') return 'bg-rose-500';
  if (status === 0 || status === 'Offline') return 'bg-slate-500';
  return 'bg-emerald-500';
};

const getStatusLabel = (status: UserStatus): string => {
  if (status === 2 || status === 'Idle') return 'Tạm vắng';
  if (status === 3 || status === 'DoNotDisturb') return 'Không làm phiền';
  if (status === 0 || status === 'Offline') return 'Ngoại tuyến';
  return 'Trực tuyến';
};

export const MemberList: React.FC = () => {
  const { activeServer, members } = useServerStore();
  const { user } = useAuthStore();

  if (!activeServer) return null;

  const displayMembers: Member[] =
    members && members.length > 0
      ? members
      : user
      ? [
          {
            id: user.id,
            userId: user.id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            status: 1,
            customStatus: user.customStatus,
            isOwner: activeServer.ownerId === user.id,
            joinedAt: new Date().toISOString(),
          },
        ]
      : [];

  const onlineMembers = displayMembers.filter((m) => isMemberOnline(m.status));
  const offlineMembers = displayMembers.filter((m) => !isMemberOnline(m.status));

  const renderMemberRow = (member: Member) => {
    const initials = (member.displayName || member.username || 'U')[0].toUpperCase();

    return (
      <div
        key={member.userId}
        className="flex items-center space-x-2.5 px-2 py-1.5 rounded-lg hover:bg-pulse-hover/50 transition"
      >
        <div className="relative shrink-0">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-pulse-accent flex items-center justify-center font-bold text-xs text-white">
              {initials}
            </div>
          )}
          <div
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-pulse-panel ${getStatusColor(
              member.status
            )}`}
          />
        </div>

        <div className="overflow-hidden flex-1">
          <div className="flex items-center space-x-1">
            <span className="text-xs font-semibold text-white truncate">
              {member.displayName}
            </span>
            {member.isOwner && (
              <span title="Chủ Server" className="shrink-0">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </span>
            )}
          </div>
          <div className="text-[10px] text-pulse-muted truncate">
            {member.customStatus || getStatusLabel(member.status)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-56 bg-pulse-panel border-l border-pulse-border p-3 flex flex-col select-none overflow-y-auto shrink-0 space-y-4">
      <div>
        <div className="text-[11px] font-bold text-pulse-muted uppercase tracking-wider px-2 mb-1.5">
          Trực tuyến — {onlineMembers.length}
        </div>
        <div className="space-y-0.5">{onlineMembers.map(renderMemberRow)}</div>
      </div>

      {offlineMembers.length > 0 && (
        <div>
          <div className="text-[11px] font-bold text-pulse-muted uppercase tracking-wider px-2 mb-1.5">
            Ngoại tuyến — {offlineMembers.length}
          </div>
          <div className="space-y-0.5 opacity-60">{offlineMembers.map(renderMemberRow)}</div>
        </div>
      )}
    </aside>
  );
};
