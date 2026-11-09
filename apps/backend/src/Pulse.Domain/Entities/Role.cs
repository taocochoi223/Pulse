using Pulse.Domain.Common;

namespace Pulse.Domain.Entities;

public class Role : BaseEntity
{
    public Guid ServerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? ColorHex { get; set; }
    public long Permissions { get; set; } // Bitmask
    public int Position { get; set; }
    public bool IsMentionable { get; set; }

    // Navigation properties
    public Server Server { get; set; } = null!;
    public ICollection<MemberRole> MemberRoles { get; set; } = [];
}

