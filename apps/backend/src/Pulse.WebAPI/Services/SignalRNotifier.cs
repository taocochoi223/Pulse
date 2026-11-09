using Microsoft.AspNetCore.SignalR;
using Pulse.Application.Common.Interfaces;
using Pulse.WebAPI.Hubs;

namespace Pulse.WebAPI.Services;

public class SignalRNotifier : ISignalRNotifier
{
    private readonly IHubContext<ChatHub> _hubContext;

    public SignalRNotifier(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public async Task NotifyMessageCreatedAsync(Guid channelId, object messagePayload, CancellationToken cancellationToken = default)
    {
        var groupName = ChatHub.GetChannelGroupName(channelId);
        await _hubContext.Clients.Group(groupName).SendAsync("MessageReceived", messagePayload, cancellationToken);
    }

    public async Task NotifyUserTypingAsync(Guid channelId, Guid userId, string username, CancellationToken cancellationToken = default)
    {
        var groupName = ChatHub.GetChannelGroupName(channelId);
        await _hubContext.Clients.Group(groupName).SendAsync("UserTyping", new { ChannelId = channelId, UserId = userId, Username = username }, cancellationToken);
    }

    public async Task NotifyPresenceChangedAsync(Guid userId, int status, CancellationToken cancellationToken = default)
    {
        await _hubContext.Clients.All.SendAsync("UserPresenceChanged", new { UserId = userId, Status = status }, cancellationToken);
    }
}

