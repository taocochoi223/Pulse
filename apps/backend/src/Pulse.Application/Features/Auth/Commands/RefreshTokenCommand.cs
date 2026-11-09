using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Dtos;
using Pulse.Domain.Entities;

namespace Pulse.Application.Features.Auth.Commands;

public record RefreshTokenCommand(
    string RefreshToken
) : IRequest<AuthResponseDto>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtGenerator;

    public RefreshTokenCommandHandler(
        IApplicationDbContext context,
        IJwtTokenGenerator jwtGenerator)
    {
        _context = context;
        _jwtGenerator = jwtGenerator;
    }

    public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var existingToken = await _context.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == request.RefreshToken, cancellationToken);

        if (existingToken == null || !existingToken.IsActive)
        {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }

        // Revoke current token
        existingToken.IsRevoked = true;
        existingToken.RevokedAt = DateTimeOffset.UtcNow;

        // Generate replacement token
        var (newRefreshTokenString, newRefreshExpiry) = _jwtGenerator.GenerateRefreshToken();
        var newRefreshToken = new RefreshToken
        {
            UserId = existingToken.UserId,
            Token = newRefreshTokenString,
            ExpiresAt = newRefreshExpiry
        };
        existingToken.ReplacedByToken = newRefreshTokenString;

        _context.RefreshTokens.Add(newRefreshToken);
        await _context.SaveChangesAsync(cancellationToken);

        var user = existingToken.User;
        var newAccessToken = _jwtGenerator.GenerateAccessToken(user.Id, user.Username, user.Email);

        var userDto = new UserDto(
            user.Id,
            user.Username,
            user.DisplayName,
            user.Email,
            user.AvatarUrl,
            user.Status,
            user.CustomStatus
        );

        return new AuthResponseDto(newAccessToken, newRefreshToken.Token, newRefreshToken.ExpiresAt, userDto);
    }
}
