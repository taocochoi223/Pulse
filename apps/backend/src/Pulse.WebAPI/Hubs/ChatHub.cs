using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Pulse.Application.Common.Interfaces;

namespace Pulse.WebAPI.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IRedisPresenceService _presenceService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(IRedisPresenceService presenceService, ILogger<ChatHub> logger)
    {
        _presenceService = presenceService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await _presenceService.SetUserOnlineAsync(userId.Value, Context.ConnectionId);
            await Clients.Others.SendAsync("UserPresenceChanged", new { UserId = userId.Value, Status = 1 });
            _logger.LogInformation("User {UserId} connected with ConnectionId {ConnectionId}", userId.Value, Context.ConnectionId);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId.HasValue)
        {
            await _presenceService.SetUserOfflineAsync(userId.Value, Context.ConnectionId);
            var isStillOnline = await _presenceService.IsUserOnlineAsync(userId.Value);
            if (!isStillOnline)
            {
                await Clients.Others.SendAsync("UserPresenceChanged", new { UserId = userId.Value, Status = 0 });
            }
            _logger.LogInformation("User {UserId} disconnected", userId.Value);
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinChannel(Guid channelId)
    {
        var groupName = GetChannelGroupName(channelId);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Connection {ConnectionId} joined channel {ChannelId}", Context.ConnectionId, channelId);
    }

    public async Task LeaveChannel(Guid channelId)
    {
        var groupName = GetChannelGroupName(channelId);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        _logger.LogDebug("Connection {ConnectionId} left channel {ChannelId}", Context.ConnectionId, channelId);
    }

    public async Task UserTyping(Guid channelId)
    {
        var userId = GetUserId();
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Someone";

        if (userId.HasValue)
        {
            await _presenceService.SetUserTypingAsync(channelId, userId.Value, username);
            var groupName = GetChannelGroupName(channelId);
            await Clients.OthersInGroup(groupName).SendAsync("UserTyping", new { ChannelId = channelId, UserId = userId.Value, Username = username });
        }
    }

    private Guid? GetUserId()
    {
        var claim = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    public static string GetChannelGroupName(Guid channelId) => $"channel-{channelId}";
}

