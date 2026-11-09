using System.Collections.Concurrent;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Pulse.Application.Common.Interfaces;

namespace Pulse.WebAPI.Hubs;

public record VoiceParticipantDto(
    string Identity,
    string ConnectionId,
    string Name,
    string? AvatarUrl,
    bool IsSpeaking,
    bool IsMuted,
    bool IsDeafened,
    bool IsCameraOn,
    bool IsScreenSharing
);

[Authorize]
public class ChatHub : Hub
{
    private readonly IRedisPresenceService _presenceService;
    private readonly ILogger<ChatHub> _logger;

    // ChannelId -> (ConnectionId -> VoiceParticipantDto)
    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, VoiceParticipantDto>> VoiceRooms = new();
    // ChannelId -> StartedAt (first participant joined timestamp)
    private static readonly ConcurrentDictionary<Guid, DateTimeOffset> VoiceRoomStartedAt = new();
    // ConnectionId -> ChannelId
    private static readonly ConcurrentDictionary<string, Guid> ConnectionVoiceRoomMap = new();

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

        // Remove from any active voice channel
        if (ConnectionVoiceRoomMap.TryRemove(Context.ConnectionId, out var voiceChannelId))
        {
            if (VoiceRooms.TryGetValue(voiceChannelId, out var participants))
            {
                participants.TryRemove(Context.ConnectionId, out _);
                if (participants.IsEmpty)
                {
                    VoiceRoomStartedAt.TryRemove(voiceChannelId, out _);
                }
                await BroadcastVoiceRoomStateAsync(voiceChannelId);
            }
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
        var username = Context.User?.FindFirstValue(ClaimTypes.Name)
            ?? Context.User?.FindFirstValue("unique_name")
            ?? "Someone";

        if (userId.HasValue)
        {
            await _presenceService.SetUserTypingAsync(channelId, userId.Value, username);
            var groupName = GetChannelGroupName(channelId);
            await Clients.OthersInGroup(groupName).SendAsync("UserTyping", new { ChannelId = channelId, UserId = userId.Value, Username = username });
        }
    }

    // =========================================================================
    // GROUP VOICE / VIDEO / SCREEN-SHARE MEETING ROOM & WEBRTC SIGNALING
    // =========================================================================

    public async Task<IReadOnlyList<VoiceParticipantDto>> JoinVoiceChannel(
        Guid channelId,
        string displayName,
        string? avatarUrl = null)
    {
        var userId = GetUserId();
        var identity = userId?.ToString() ?? Context.ConnectionId;
        var name = !string.IsNullOrWhiteSpace(displayName)
            ? displayName
            : (Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Member");

        // If previously in another voice room, leave it first
        if (ConnectionVoiceRoomMap.TryRemove(Context.ConnectionId, out var oldChannelId) && oldChannelId != channelId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetVoiceGroupName(oldChannelId));
            if (VoiceRooms.TryGetValue(oldChannelId, out var oldRoom))
            {
                oldRoom.TryRemove(Context.ConnectionId, out _);
                if (oldRoom.IsEmpty)
                {
                    VoiceRoomStartedAt.TryRemove(oldChannelId, out _);
                }
                await BroadcastVoiceRoomStateAsync(oldChannelId);
            }
        }

        var room = VoiceRooms.GetOrAdd(channelId, _ => new ConcurrentDictionary<string, VoiceParticipantDto>());
        if (room.IsEmpty)
        {
            VoiceRoomStartedAt[channelId] = DateTimeOffset.UtcNow;
        }
        else
        {
            VoiceRoomStartedAt.GetOrAdd(channelId, _ => DateTimeOffset.UtcNow);
        }

        // Deduplicate same user identity if reconnecting
        foreach (var kvp in room.Where(x => x.Value.Identity == identity && x.Key != Context.ConnectionId).ToList())
        {
            room.TryRemove(kvp.Key, out _);
        }

        var participant = new VoiceParticipantDto(
            Identity: identity,
            ConnectionId: Context.ConnectionId,
            Name: name,
            AvatarUrl: avatarUrl,
            IsSpeaking: false,
            IsMuted: false,
            IsDeafened: false,
            IsCameraOn: false,
            IsScreenSharing: false
        );

        room[Context.ConnectionId] = participant;
        ConnectionVoiceRoomMap[Context.ConnectionId] = channelId;

        await Groups.AddToGroupAsync(Context.ConnectionId, GetVoiceGroupName(channelId));
        await BroadcastVoiceRoomStateAsync(channelId);

        // Notify existing peers in the voice room so they can initiate WebRTC peer connections
        await Clients.OthersInGroup(GetVoiceGroupName(channelId)).SendAsync("VoicePeerJoined", participant);

        return room.Values.ToList();
    }

    public async Task LeaveVoiceChannel(Guid channelId)
    {
        ConnectionVoiceRoomMap.TryRemove(Context.ConnectionId, out _);
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetVoiceGroupName(channelId));

        if (VoiceRooms.TryGetValue(channelId, out var room))
        {
            room.TryRemove(Context.ConnectionId, out _);
            if (room.IsEmpty)
            {
                VoiceRoomStartedAt.TryRemove(channelId, out _);
            }
            await BroadcastVoiceRoomStateAsync(channelId);
        }

        await Clients.OthersInGroup(GetVoiceGroupName(channelId)).SendAsync("VoicePeerLeft", new
        {
            ConnectionId = Context.ConnectionId,
            Identity = GetUserId()?.ToString() ?? Context.ConnectionId
        });
    }

    public async Task UpdateVoiceState(
        Guid channelId,
        bool isMuted,
        bool isDeafened,
        bool isCameraOn,
        bool isScreenSharing,
        bool isSpeaking)
    {
        if (VoiceRooms.TryGetValue(channelId, out var room) &&
            room.TryGetValue(Context.ConnectionId, out var existing))
        {
            room[Context.ConnectionId] = existing with
            {
                IsMuted = isMuted,
                IsDeafened = isDeafened,
                IsCameraOn = isCameraOn,
                IsScreenSharing = isScreenSharing,
                IsSpeaking = isSpeaking
            };

            await BroadcastVoiceRoomStateAsync(channelId);
        }
    }

    public Task<IReadOnlyList<VoiceParticipantDto>> GetVoiceParticipants(Guid channelId)
    {
        if (VoiceRooms.TryGetValue(channelId, out var room))
        {
            return Task.FromResult<IReadOnlyList<VoiceParticipantDto>>(room.Values.ToList());
        }
        return Task.FromResult<IReadOnlyList<VoiceParticipantDto>>(Array.Empty<VoiceParticipantDto>());
    }

    public async Task SendWebRtcSignal(string targetConnectionId, object signalData)
    {
        await Clients.Client(targetConnectionId).SendAsync("ReceiveWebRtcSignal", new
        {
            FromConnectionId = Context.ConnectionId,
            FromIdentity = GetUserId()?.ToString() ?? Context.ConnectionId,
            Signal = signalData
        });
    }

    private async Task BroadcastVoiceRoomStateAsync(Guid channelId)
    {
        var list = VoiceRooms.TryGetValue(channelId, out var room)
            ? room.Values.ToList()
            : new List<VoiceParticipantDto>();

        DateTimeOffset? startedAt = null;
        if (list.Count > 0 && VoiceRoomStartedAt.TryGetValue(channelId, out var ts))
        {
            startedAt = ts;
        }

        await Clients.All.SendAsync("VoiceParticipantsUpdated", new
        {
            ChannelId = channelId,
            Participants = list,
            StartedAt = startedAt
        });
    }

    private Guid? GetUserId()
    {
        var claim = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
        return Guid.TryParse(claim, out var id) ? id : null;
    }

    public static string GetChannelGroupName(Guid channelId) => $"channel-{channelId}";
    public static string GetVoiceGroupName(Guid channelId) => $"voice-{channelId}";
}
