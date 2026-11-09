using Pulse.Domain.Common;

namespace Pulse.Domain.Entities;

public class Server : BaseEntity, ISoftDeletable
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public string InviteCode { get; set; } = string.Empty;
    public Guid OwnerId { get; set; }

    // Soft delete
    public bool IsDeleted { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    // Navigation properties
    public User Owner { get; set; } = null!;
    public ICollection<Channel> Channels { get; set; } = [];
    public ICollection<Member> Members { get; set; } = [];
    public ICollection<Role> Roles { get; set; } = [];
}

