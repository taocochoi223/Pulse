using Pulse.Domain.Common;
using Pulse.Domain.Enums;

namespace Pulse.Domain.Entities;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Offline;
    public string? CustomStatus { get; set; }

    // Navigation properties
    public ICollection<Member> Memberships { get; set; } = [];
    public ICollection<Server> OwnedServers { get; set; } = [];
    public ICollection<Message> Messages { get; set; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; set; } = [];
}

