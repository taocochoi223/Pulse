using Pulse.Domain.Common;

namespace Pulse.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public string? ReplacedByToken { get; set; }
    public string? CreatedByIp { get; set; }

    public bool IsActive => !IsRevoked && DateTimeOffset.UtcNow < ExpiresAt;

    // Navigation property
    public User User { get; set; } = null!;
}

