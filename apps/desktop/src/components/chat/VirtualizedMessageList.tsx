import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageItem } from './MessageItem';
import { Hash } from 'lucide-react';
import type { Message } from '../../types';

interface VirtualizedMessageListProps {
  messages: Message[];
  channelName?: string;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  channelName,
  isLoadingMore,
  hasMore,
  onLoadMore,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 68,
    overscan: 12,
  });

  // Handle infinite scroll up to load previous messages
  const handleScroll = () => {
    if (!parentRef.current) return;
    const { scrollTop } = parentRef.current;
    if (scrollTop < 80 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  };

  // Auto-scroll to bottom on first load and new incoming message
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (!parentRef.current) return;

    if (messages.length > prevMessagesLength.current) {
      const isAtBottom =
        parentRef.current.scrollHeight - parentRef.current.scrollTop - parentRef.current.clientHeight < 280;

      if (isAtBottom || prevMessagesLength.current === 0) {
        requestAnimationFrame(() => {
          if (parentRef.current) {
            parentRef.current.scrollTop = parentRef.current.scrollHeight;
          }
        });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 overflow-y-auto px-2 py-4 space-y-1 select-text"
    >
      {/* Top Loader */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-pulse-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Channel Welcome Header */}
      {(!hasMore || messages.length === 0) && (
        <div className="px-4 pt-4 pb-6 border-b border-pulse-border/40 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-pulse-card border border-pulse-border flex items-center justify-center text-pulse-accent mb-3">
            <Hash className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Chào mừng đến với #{channelName || 'general'}!
          </h2>
          <p className="text-xs text-pulse-muted mt-1">
            Đây là điểm bắt đầu của kênh #{channelName || 'general'}. Hãy gửi tin nhắn, đính kèm hình ảnh/tệp hoặc thả emoji bên dưới.
          </p>
        </div>
      )}

      {/* Virtualized Container */}
      {messages.length > 0 && (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const message = messages[virtualItem.index];
            if (!message) return null;

            const repliedMessage = message.replyToMessageId
              ? messages.find((m) => m.id === message.replyToMessageId)
              : undefined;

            return (
              <div
                key={message.id || virtualItem.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <MessageItem message={message} repliedMessage={repliedMessage} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
