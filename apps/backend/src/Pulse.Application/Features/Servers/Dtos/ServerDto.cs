using Pulse.Application.Features.Channels.Dtos;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Servers.Dtos;

public record MemberDto(
    Guid Id,
    Guid UserId,
    string Username,
    string DisplayName,
    string? Nickname,
    string? AvatarUrl,
    UserStatus Status,
    string? CustomStatus,
    bool IsOwner,
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
    IReadOnlyCollection<ChannelDto>? Channels = null,
    IReadOnlyCollection<MemberDto>? Members = null
);
