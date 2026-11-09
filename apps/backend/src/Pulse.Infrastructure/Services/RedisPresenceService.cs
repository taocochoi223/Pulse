using System.Collections.Concurrent;
using Pulse.Application.Common.Interfaces;
using StackExchange.Redis;

namespace Pulse.Infrastructure.Services;

/// <summary>
/// Hybrid Presence Service: Uses Redis when connected, and seamlessly falls back
/// to thread-safe In-Memory tracking when Redis is offline on local dev machines.
/// </summary>
public class RedisPresenceService : IRedisPresenceService
{
    private readonly IConnectionMultiplexer? _redis;
    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, byte>> InMemoryConnections = new();
    private static readonly ConcurrentDictionary<string, DateTimeOffset> InMemoryTyping = new();

    public RedisPresenceService(IConnectionMultiplexer? redis = null)
    {
        _redis = redis;
    }

    private bool IsRedisAvailable => _redis is { IsConnected: true };

    public async Task SetUserOnlineAsync(Guid userId, string connectionId)
    {
        var connections = InMemoryConnections.GetOrAdd(userId, _ => new ConcurrentDictionary<string, byte>());
        connections.TryAdd(connectionId, 1);

        if (IsRedisAvailable)
        {
            try
            {
                var db = _redis!.GetDatabase();
                var userSetKey = $"presence:user:{userId}";
                await db.SetAddAsync(userSetKey, connectionId);
                await db.KeyExpireAsync(userSetKey, TimeSpan.FromDays(1));
                await db.SetAddAsync("presence:online_users", userId.ToString());
            }
            catch
            {
                // Ignore Redis error; InMemory state is already updated
            }
        }
    }

    public async Task SetUserOfflineAsync(Guid userId, string connectionId)
    {
        if (InMemoryConnections.TryGetValue(userId, out var connections))
        {
            connections.TryRemove(connectionId, out _);
            if (connections.IsEmpty)
            {
                InMemoryConnections.TryRemove(userId, out _);
            }
        }

        if (IsRedisAvailable)
        {
            try
            {
                var db = _redis!.GetDatabase();
                var userSetKey = $"presence:user:{userId}";
                await db.SetRemoveAsync(userSetKey, connectionId);

                var remainingConnections = await db.SetLengthAsync(userSetKey);
                if (remainingConnections == 0)
                {
                    await db.KeyDeleteAsync(userSetKey);
                    await db.SetRemoveAsync("presence:online_users", userId.ToString());
                }
            }
            catch
            {
                // Ignore Redis error
            }
        }
    }

    public async Task<bool> IsUserOnlineAsync(Guid userId)
    {
        if (InMemoryConnections.TryGetValue(userId, out var connections) && !connections.IsEmpty)
        {
            return true;
        }

        if (IsRedisAvailable)
        {
            try
            {
                var db = _redis!.GetDatabase();
                return await db.SetContainsAsync("presence:online_users", userId.ToString());
            }
            catch
            {
                // Fall back to in-memory result
            }
        }

        return false;
    }

    public async Task<IReadOnlyCollection<Guid>> GetOnlineUsersAsync(IEnumerable<Guid> userIds)
    {
        var result = new List<Guid>();
        foreach (var id in userIds)
        {
            if (await IsUserOnlineAsync(id))
            {
                result.Add(id);
            }
        }
        return result.AsReadOnly();
    }

    public async Task SetUserTypingAsync(Guid channelId, Guid userId, string username)
    {
        var typingKey = $"typing:{channelId}:{userId}";
        InMemoryTyping[typingKey] = DateTimeOffset.UtcNow.AddSeconds(5);

        if (IsRedisAvailable)
        {
            try
            {
                var db = _redis!.GetDatabase();
                await db.StringSetAsync(typingKey, username, TimeSpan.FromSeconds(5));
            }
            catch
            {
                // Ignore Redis error
            }
        }
    }
}
