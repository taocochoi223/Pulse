import React from 'react';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = new Date(message.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  const initials = message.sender.displayName
    ? message.sender.displayName[0].toUpperCase()
    : 'U';

  return (
    <div className="group flex items-start space-x-3 py-1.5 px-4 hover:bg-pulse-card/40 rounded-lg transition-colors">
      {/* Avatar */}
      {message.sender.avatarUrl ? (
        <img
          src={message.sender.avatarUrl}
          alt={message.sender.displayName}
          className="w-9 h-9 rounded-full object-cover mt-0.5"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-pulse-accent/80 flex items-center justify-center font-bold text-xs text-white mt-0.5 shrink-0">
          {initials}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2">
          <span className="font-semibold text-sm text-white hover:underline cursor-pointer">
            {message.sender.displayName}
          </span>
          <span className="text-[11px] text-pulse-muted">
            {formattedDate} at {formattedTime}
          </span>
          {message.isEdited && (
            <span className="text-[10px] text-pulse-muted">(edited)</span>
          )}
        </div>

        <div className="text-sm text-pulse-text mt-0.5 break-words whitespace-pre-wrap leading-relaxed select-text">
          {message.content}
        </div>
      </div>
    </div>
  );
};
