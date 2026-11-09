using Pulse.Application.Common.Interfaces;
using StackExchange.Redis;

namespace Pulse.Infrastructure.Services;

public class RedisPresenceService : IRedisPresenceService
{
    private readonly IConnectionMultiplexer _redis;
    private readonly IDatabase _db;

    public RedisPresenceService(IConnectionMultiplexer redis)
    {
        _redis = redis;
        _db = redis.GetDatabase();
    }

    public async Task SetUserOnlineAsync(Guid userId, string connectionId)
    {
        var userSetKey = $"presence:user:{userId}";
        await _db.SetAddAsync(userSetKey, connectionId);
        await _db.KeyExpireAsync(userSetKey, TimeSpan.FromDays(1));

        // Global set of online user ids
        await _db.SetAddAsync("presence:online_users", userId.ToString());
    }

    public async Task SetUserOfflineAsync(Guid userId, string connectionId)
    {
        var userSetKey = $"presence:user:{userId}";
        await _db.SetRemoveAsync(userSetKey, connectionId);

        var remainingConnections = await _db.SetLengthAsync(userSetKey);
        if (remainingConnections == 0)
        {
            await _db.KeyDeleteAsync(userSetKey);
            await _db.SetRemoveAsync("presence:online_users", userId.ToString());
        }
    }

    public async Task<bool> IsUserOnlineAsync(Guid userId)
    {
        return await _db.SetContainsAsync("presence:online_users", userId.ToString());
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
        await _db.StringSetAsync(typingKey, username, TimeSpan.FromSeconds(5));
    }
}

