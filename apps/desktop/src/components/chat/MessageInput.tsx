import React, { useState, useRef } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';
import { signalRService } from '../../services/signalr';

interface MessageInputProps {
  channelName: string;
  channelId: string;
  onSendMessage: (content: string) => Promise<void>;
  typingUsers: { [userId: string]: string };
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  channelId,
  onSendMessage,
  typingUsers,
}) => {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!content.trim() || isSending) return;

      setIsSending(true);
      const text = content.trim();
      setContent('');
      try {
        await onSendMessage(text);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Send typing status throttled
    if (!typingTimeoutRef.current) {
      signalRService.sendTyping(channelId);
      typingTimeoutRef.current = window.setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 3000);
    }
  };

  const typingNames = Object.values(typingUsers);
  const typingIndicatorText =
    typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : typingNames.length > 1
      ? `${typingNames.slice(0, 3).join(', ')} are typing...`
      : null;

  return (
    <div className="px-4 pb-4">
      {/* Typing indicator banner */}
      <div className="h-5 text-xs text-pulse-muted px-2 flex items-center">
        {typingIndicatorText && (
          <div className="flex items-center space-x-1 animate-pulse">
            <span className="font-medium text-pulse-accent">{typingIndicatorText}</span>
          </div>
        )}
      </div>

      <div className="bg-pulse-card border border-pulse-border rounded-xl px-4 py-2.5 flex items-center space-x-3 focus-within:border-pulse-accent/80 transition shadow-inner">
        <button
          type="button"
          title="Attach file"
          className="text-pulse-muted hover:text-white transition"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <textarea
          rows={1}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${channelName}`}
          className="flex-1 bg-transparent text-white placeholder-pulse-muted resize-none focus:outline-none text-sm max-h-32 leading-relaxed"
        />

        <button
          type="button"
          title="Emoji"
          className="text-pulse-muted hover:text-white transition"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          onClick={async () => {
            if (!content.trim() || isSending) return;
            setIsSending(true);
            const text = content.trim();
            setContent('');
            try {
              await onSendMessage(text);
            } finally {
              setIsSending(false);
            }
          }}
          disabled={!content.trim() || isSending}
          title="Send"
          className={`p-1.5 rounded-lg transition ${
            content.trim()
              ? 'bg-pulse-accent text-white hover:bg-pulse-accentHover'
              : 'text-pulse-muted cursor-not-allowed opacity-50'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
