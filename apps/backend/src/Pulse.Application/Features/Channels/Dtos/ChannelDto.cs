using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Channels.Dtos;

public record ChannelDto(
    Guid Id,
    Guid ServerId,
    string Name,
    string? Topic,
    ChannelType Type,
    int Position,
    DateTimeOffset CreatedAt
);
