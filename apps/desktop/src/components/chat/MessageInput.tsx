import React, { useState, useRef } from 'react';
import { Send, Smile, Paperclip, X, Reply, FileText, Loader2, Code2 } from 'lucide-react';
import { signalRService } from '../../services/signalr';
import { apiClient } from '../../services/api';
import { useMessageStore } from '../../stores/useMessageStore';
import type { AttachmentInput } from '../../types';

interface MessageInputProps {
  channelName: string;
  channelId: string;
  onSendMessage: (
    content: string,
    replyToMessageId?: string,
    attachments?: AttachmentInput[]
  ) => Promise<void>;
  typingUsers: { [userId: string]: string };
}

const POPULAR_EMOJIS = [
  '😀', '😂', '🤣', '😊', '😍', '🥰', '😎', '🤩',
  '🤔', '🫡', '🙌', '👍', '👎', '👏', '🔥', '✨',
  '🎉', '❤️', '💯', '🚀', '💻', '🐛', '✅', '⚡',
  '☕', '🍕', '🎮', '🎧', '📌', '📢', '🤝', '🙏',
];

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  channelId,
  onSendMessage,
  typingUsers,
}) => {
  const { replyingTo, setReplyingTo } = useMessageStore();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentInput[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = (content.trim().length > 0 || pendingAttachments.length > 0) && !isSending && !isUploading;

  const submitMessage = async () => {
    if (!canSend) return;

    setIsSending(true);
    const text = content.trim();
    const replyId = replyingTo?.id;
    const attachmentsToSend = [...pendingAttachments];

    setContent('');
    setPendingAttachments([]);
    setShowEmojiPicker(false);

    try {
      await onSendMessage(text, replyId, attachmentsToSend);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await submitMessage();
    } else if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Send typing status throttled
    if (!typingTimeoutRef.current) {
      signalRService.sendTyping(channelId);
      typingTimeoutRef.current = window.setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2500);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await apiClient.post<AttachmentInput>('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setPendingAttachments((prev) => [...prev, data]);
      }
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      await uploadFiles(pastedFiles);
    }
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const typingNames = Object.values(typingUsers);
  const typingIndicatorText =
    typingNames.length === 1
      ? `${typingNames[0]} đang nhập...`
      : typingNames.length > 1
      ? `${typingNames.slice(0, 3).join(', ')} đang nhập...`
      : null;

  return (
    <div className="px-4 pb-4 relative">
      {/* Typing indicator banner */}
      <div className="h-5 text-xs text-pulse-muted px-2 flex items-center">
        {typingIndicatorText && (
          <div className="flex items-center space-x-1 animate-pulse">
            <span className="font-medium text-pulse-accent">{typingIndicatorText}</span>
          </div>
        )}
      </div>

      {/* Replying To Banner */}
      {replyingTo && (
        <div className="bg-pulse-panel border border-b-0 border-pulse-border rounded-t-xl px-3.5 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <Reply className="w-3.5 h-3.5 text-pulse-accent shrink-0" />
            <span className="text-pulse-muted">Đang trả lời</span>
            <span className="font-bold text-white">@{replyingTo.sender.displayName}</span>
            <span className="text-pulse-muted truncate max-w-xs">{replyingTo.content}</span>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="text-pulse-muted hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pending Attachments Preview Bar */}
      {pendingAttachments.length > 0 && (
        <div className="bg-pulse-panel/90 border border-b-0 border-pulse-border px-3.5 py-2.5 flex flex-wrap gap-2">
          {pendingAttachments.map((att, idx) => {
            const isImg = att.contentType?.startsWith('image/');
            return (
              <div
                key={idx}
                className="relative group flex items-center space-x-2 bg-pulse-bg border border-pulse-border rounded-lg p-1.5 pr-6"
              >
                {isImg ? (
                  <img
                    src={att.fileUrl}
                    alt={att.fileName}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-pulse-accent/20 text-pulse-accent flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="max-w-[140px]">
                  <div className="text-xs text-white font-medium truncate">{att.fileName}</div>
                  <div className="text-[10px] text-emerald-400">Đã tải lên</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-500/80 text-white hover:bg-rose-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 right-6 bg-pulse-panel border border-pulse-border rounded-2xl p-3 shadow-2xl z-30 w-64">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-pulse-muted uppercase">Biểu cảm nhanh</span>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              className="text-pulse-muted hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1">
            {POPULAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-7 h-7 flex items-center justify-center text-base hover:bg-pulse-hover rounded-lg transition hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(e.target.files);
          }
        }}
      />

      <div
        className={`bg-pulse-card border border-pulse-border px-4 py-2.5 flex items-center space-x-3 focus-within:border-pulse-accent/80 transition shadow-inner ${
          replyingTo || pendingAttachments.length > 0 ? 'rounded-b-xl' : 'rounded-xl'
        }`}
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Đính kèm hình ảnh hoặc tệp tin"
          className="text-pulse-muted hover:text-white transition disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin text-pulse-accent" />
          ) : (
            <Paperclip className="w-5 h-5" />
          )}
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={`Nhắn tin tới #${channelName} (hỗ trợ dán ảnh Ctrl+V)...`}
          className="flex-1 bg-transparent text-white placeholder-pulse-muted resize-none focus:outline-none text-sm max-h-32 leading-relaxed"
        />

        <button
          type="button"
          onClick={() => {
            setContent((prev) => `${prev}\`\`\`ts\n// code here\n\`\`\``);
            textareaRef.current?.focus();
          }}
          title="Chèn đoạn Code (Code Block)"
          className="text-pulse-muted hover:text-white transition"
        >
          <Code2 className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          title="Chèn Emoji"
          className={`transition ${
            showEmojiPicker ? 'text-pulse-accent' : 'text-pulse-muted hover:text-white'
          }`}
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={submitMessage}
          disabled={!canSend}
          title="Gửi tin nhắn (Enter)"
          className={`p-1.5 rounded-lg transition ${
            canSend
              ? 'bg-pulse-accent text-white hover:bg-pulse-accentHover shadow-md shadow-pulse-accent/20'
              : 'text-pulse-muted cursor-not-allowed opacity-50'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
