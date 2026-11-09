namespace Pulse.Domain.Entities;

public class MemberRole
{
    public Guid MemberId { get; set; }
    public Guid RoleId { get; set; }
    public DateTimeOffset AssignedAt { get; set; } = DateTimeOffset.UtcNow;

    // Navigation properties
    public Member Member { get; set; } = null!;
    public Role Role { get; set; } = null!;
}

