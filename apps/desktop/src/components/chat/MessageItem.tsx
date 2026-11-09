import React, { useState } from 'react';
import type { Message } from '../../types';
import { useAuthStore } from '../../stores/useAuthStore';
import { useMessageStore } from '../../stores/useMessageStore';
import {
  Reply,
  Pencil,
  Pin,
  Trash2,
  FileText,
  Download,
  CornerUpRight,
  Check,
  X,
  Copy,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  repliedMessage?: Message;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CodeBlockView: React.FC<{ language: string; code: string }> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-pulse-border bg-[#0b0d13] max-w-2xl">
      <div className="px-3 py-1.5 bg-pulse-panel border-b border-pulse-border flex items-center justify-between text-[11px] text-pulse-muted">
        <span className="font-mono uppercase">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1 hover:text-white transition"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const renderFormattedContent = (text: string) => {
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`txt-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>
      );
    }
    const lang = match[1] || 'code';
    const codeContent = match[2].replace(/\n$/, '');
    parts.push(<CodeBlockView key={`code-${match.index}`} language={lang} code={codeContent} />);
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(<span key={`txt-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return parts;
};

export const MessageItem: React.FC<MessageItemProps> = ({ message, repliedMessage }) => {
  const { user } = useAuthStore();
  const { setReplyingTo, editMessage, deleteMessage, togglePinMessage } = useMessageStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const isOwnMessage = user?.id === message.sender.id;

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

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    await editMessage(message.id, editContent.trim());
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex flex-col py-1.5 px-4 hover:bg-pulse-card/40 rounded-lg transition-colors ${
        message.isPinned ? 'bg-amber-500/5 border-l-2 border-amber-400/70' : ''
      }`}
    >
      {/* Reply Preview Header */}
      {message.replyToMessageId && (
        <div className="flex items-center space-x-1.5 text-xs text-pulse-muted mb-1 pl-6">
          <CornerUpRight className="w-3.5 h-3.5 text-pulse-accent shrink-0" />
          <span className="font-semibold text-pulse-text">
            @{repliedMessage?.sender.displayName || 'Tin nhắn gốc'}
          </span>
          <span className="truncate max-w-md opacity-80">
            {repliedMessage?.content || 'Đã đính kèm tệp'}
          </span>
        </div>
      )}

      <div className="flex items-start space-x-3">
        {/* Avatar */}
        {message.sender.avatarUrl ? (
          <img
            src={message.sender.avatarUrl}
            alt={message.sender.displayName}
            className="w-9 h-9 rounded-full object-cover mt-0.5 shrink-0"
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
              {formattedDate} lúc {formattedTime}
            </span>
            {message.isEdited && (
              <span className="text-[10px] text-pulse-muted">(đã chỉnh sửa)</span>
            )}
            {message.isPinned && (
              <span className="inline-flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                <Pin className="w-2.5 h-2.5" />
                <span>Đã ghim</span>
              </span>
            )}
          </div>

          {/* Inline Editor or Message Content */}
          {isEditing ? (
            <div className="mt-1.5 space-y-2">
              <textarea
                rows={2}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                  }
                }}
                className="w-full bg-pulse-bg border border-pulse-accent rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none resize-none"
              />
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 bg-pulse-accent hover:bg-pulse-accentHover text-white rounded-md font-medium flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Lưu (Enter)</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 bg-pulse-card hover:bg-pulse-hover text-pulse-muted hover:text-white rounded-md flex items-center space-x-1"
                >
                  <X className="w-3 h-3" />
                  <span>Huỷ (Esc)</span>
                </button>
              </div>
            </div>
          ) : (
            message.content && (
              <div className="text-sm text-pulse-text mt-0.5 break-words whitespace-pre-wrap leading-relaxed select-text">
                {renderFormattedContent(message.content)}
              </div>
            )
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att) => {
                const isImage =
                  att.contentType?.startsWith('image/') ||
                  /\.(png|jpe?g|gif|webp|svg)$/i.test(att.fileName);

                if (isImage) {
                  return (
                    <div
                      key={att.id || att.fileUrl}
                      className="relative group/img rounded-xl overflow-hidden border border-pulse-border max-w-xs max-h-64 bg-pulse-bg cursor-pointer"
                      onClick={() => setPreviewImage(att.fileUrl)}
                    >
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="max-h-60 w-auto object-contain hover:scale-[1.02] transition-transform"
                      />
                    </div>
                  );
                }

                return (
                  <a
                    key={att.id || att.fileUrl}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={att.fileName}
                    className="flex items-center space-x-3 p-2.5 rounded-xl bg-pulse-bg border border-pulse-border hover:border-pulse-accent transition max-w-xs"
                  >
                    <div className="p-2 rounded-lg bg-pulse-accent/15 text-pulse-accent">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden flex-1">
                      <div className="text-xs font-semibold text-white truncate">
                        {att.fileName}
                      </div>
                      <div className="text-[10px] text-pulse-muted">
                        {formatFileSize(att.fileSizeBytes)}
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-pulse-muted hover:text-white shrink-0" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hover Action Toolbar */}
      {!isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 right-4 bg-pulse-panel border border-pulse-border rounded-lg shadow-lg flex items-center p-0.5 space-x-0.5 z-10">
          <button
            onClick={() => setReplyingTo(message)}
            title="Trả lời (Reply)"
            className="p-1.5 rounded hover:bg-pulse-hover text-pulse-muted hover:text-white transition"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => togglePinMessage(message.id)}
            title={message.isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn'}
            className={`p-1.5 rounded hover:bg-pulse-hover transition ${
              message.isPinned ? 'text-amber-400' : 'text-pulse-muted hover:text-white'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          {isOwnMessage && (
            <button
              onClick={() => {
                setEditContent(message.content);
                setIsEditing(true);
              }}
              title="Chỉnh sửa"
              className="p-1.5 rounded hover:bg-pulse-hover text-pulse-muted hover:text-white transition"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          {isOwnMessage && (
            <button
              onClick={() => deleteMessage(message.id)}
              title="Xoá tin nhắn"
              className="p-1.5 rounded hover:bg-rose-500/20 text-pulse-muted hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 cursor-zoom-out"
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
