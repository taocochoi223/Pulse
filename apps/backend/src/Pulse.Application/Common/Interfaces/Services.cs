namespace Pulse.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Username { get; }
    bool IsAuthenticated { get; }
}

public interface IPasswordHasher
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}

public interface IJwtTokenGenerator
{
    string GenerateAccessToken(Guid userId, string username, string email);
    (string Token, DateTimeOffset ExpiresAt) GenerateRefreshToken();
}

public interface IRedisPresenceService
{
    Task SetUserOnlineAsync(Guid userId, string connectionId);
    Task SetUserOfflineAsync(Guid userId, string connectionId);
    Task<bool> IsUserOnlineAsync(Guid userId);
    Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync(IEnumerable<Guid> userIds);
    Task SetUserTypingAsync(Guid channelId, Guid userId, string username);
}

public interface ILiveKitTokenService
{
    string GenerateJoinToken(string roomName, string participantIdentity, string participantName, bool canPublish = true, bool canSubscribe = true);
}

public interface ISignalRNotifier
{
    Task NotifyMessageCreatedAsync(Guid channelId, object messagePayload, CancellationToken cancellationToken = default);
    Task NotifyMessageUpdatedAsync(Guid channelId, object messagePayload, CancellationToken cancellationToken = default);
    Task NotifyMessageDeletedAsync(Guid channelId, Guid messageId, CancellationToken cancellationToken = default);
    Task NotifyUserTypingAsync(Guid channelId, Guid userId, string username, CancellationToken cancellationToken = default);
    Task NotifyPresenceChangedAsync(Guid userId, int status, CancellationToken cancellationToken = default);
}
