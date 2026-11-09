import React, { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MessageItem } from './MessageItem';
import type { Message } from '../../types';

interface VirtualizedMessageListProps {
  messages: Message[];
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  isLoadingMore,
  hasMore,
  onLoadMore,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 58,
    overscan: 10,
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
        parentRef.current.scrollHeight - parentRef.current.scrollTop - parentRef.current.clientHeight < 200;

      if (isAtBottom || prevMessagesLength.current === 0) {
        rowVirtualizer.scrollToIndex(messages.length - 1, { align: 'end' });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, rowVirtualizer]);

  return (
    <div
      ref={parentRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-2 py-4 space-y-1 select-text"
      style={{ contain: 'strict' }}
    >
      {/* Top Loader */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-pulse-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!hasMore && messages.length > 0 && (
        <div className="text-center py-4 text-xs text-pulse-muted border-b border-pulse-border/40 mb-3">
          This is the beginning of the chat history.
        </div>
      )}

      {/* Virtualized Container */}
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
              <MessageItem message={message} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
