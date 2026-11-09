using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Auth.Dtos;

public record UserDto(
    Guid Id,
    string Username,
    string DisplayName,
    string Email,
    string? AvatarUrl,
    UserStatus Status,
    string? CustomStatus
);

public record AuthResponseDto(
    string AccessToken,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    UserDto User
);
