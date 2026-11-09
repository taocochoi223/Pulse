using Pulse.Domain.Common;

namespace Pulse.Domain.Entities;

public class Member : BaseEntity
{
    public Guid ServerId { get; set; }
    public Guid UserId { get; set; }
    public string? Nickname { get; set; }
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Server Server { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<MemberRole> MemberRoles { get; set; } = [];
}

