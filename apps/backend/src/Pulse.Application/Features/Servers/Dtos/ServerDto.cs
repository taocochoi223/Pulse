using Pulse.Application.Features.Channels.Dtos;

namespace Pulse.Application.Features.Servers.Dtos;

public record MemberDto(
    Guid Id,
    Guid UserId,
    string Username,
    string DisplayName,
    string? Nickname,
    string? AvatarUrl,
    DateTimeOffset JoinedAt
);

public record ServerDto(
    Guid Id,
    string Name,
    string? Description,
    string? IconUrl,
    string InviteCode,
    Guid OwnerId,
    DateTimeOffset CreatedAt,
    int MemberCount,
    IReadOnlyCollection<ChannelDto>? Channels = null
);
