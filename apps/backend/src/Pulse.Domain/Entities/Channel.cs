using Pulse.Domain.Common;
using Pulse.Domain.Enums;

namespace Pulse.Domain.Entities;

public class Channel : BaseEntity, ISoftDeletable
{
    public Guid ServerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public ChannelType Type { get; set; } = ChannelType.Text;
    public int Position { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // Navigation properties
    public Server Server { get; set; } = null!;
    public ICollection<Message> Messages { get; set; } = [];
}
