using Pulse.Domain.Common;
using Pulse.Domain.Enums;

namespace Pulse.Domain.Entities;

public class Message : BaseEntity, ISoftDeletable
{
    public Guid ChannelId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public MessageType Type { get; set; } = MessageType.Default;
    public Guid? ReplyToMessageId { get; set; }
    public bool IsPinned { get; set; }
    public bool IsEdited { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // Navigation properties
    public Channel Channel { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public Message? ReplyToMessage { get; set; }
    public ICollection<Message> Replies { get; set; } = [];
    public ICollection<Attachment> Attachments { get; set; } = [];
}

