using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Commands;
using Pulse.Application.Features.Auth.Dtos;
using Pulse.Domain.Enums;

namespace Pulse.WebAPI.Controllers;

public record UpdateProfileRequest(
    string DisplayName,
    string? AvatarUrl,
    UserStatus Status,
    string? CustomStatus
);

public class AuthController : ApiControllerBase
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IApplicationDbContext _context;
    private readonly ISignalRNotifier _signalRNotifier;

    public AuthController(
        ICurrentUserService currentUserService,
        IApplicationDbContext context,
        ISignalRNotifier signalRNotifier)
    {
        _currentUserService = currentUserService;
        _context = context;
        _signalRNotifier = signalRNotifier;
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpPost("refresh-token")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponseDto>> RefreshToken([FromBody] RefreshTokenCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User", userId);

        return Ok(new UserDto(
            user.Id,
            user.Username,
            user.DisplayName,
            user.Email,
            user.AvatarUrl,
            user.Status,
            user.CustomStatus
        ));
    }

    [HttpPut("profile")]
    [Authorize]
    public async Task<ActionResult<UserDto>> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User", userId);

        if (!string.IsNullOrWhiteSpace(request.DisplayName))
        {
            user.DisplayName = request.DisplayName.Trim();
        }
        user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
        user.Status = request.Status;
        user.CustomStatus = string.IsNullOrWhiteSpace(request.CustomStatus) ? null : request.CustomStatus.Trim();
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _signalRNotifier.NotifyPresenceChangedAsync(user.Id, (int)user.Status, cancellationToken);

        return Ok(new UserDto(
            user.Id,
            user.Username,
            user.DisplayName,
            user.Email,
            user.AvatarUrl,
            user.Status,
            user.CustomStatus
        ));
    }
}
