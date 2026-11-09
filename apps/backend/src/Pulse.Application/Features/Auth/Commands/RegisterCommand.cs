using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Dtos;
using Pulse.Domain.Entities;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Auth.Commands;

public record RegisterCommand(
    string Username,
    string DisplayName,
    string Email,
    string Password
) : IRequest<AuthResponseDto>;

public class RegisterCommandValidator : AbstractValidator<RegisterCommand>
{
    public RegisterCommandValidator()
    {
        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("Username is required.")
            .MinimumLength(3).WithMessage("Username must be at least 3 characters.")
            .MaximumLength(30).WithMessage("Username must not exceed 30 characters.")
            .Matches("^[a-zA-Z0-9_.-]+$").WithMessage("Username can only contain letters, numbers, and . _ -");

        RuleFor(x => x.DisplayName)
            .NotEmpty().WithMessage("DisplayName is required.")
            .MaximumLength(50).WithMessage("DisplayName must not exceed 50 characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(6).WithMessage("Password must be at least 6 characters.");
    }
}

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtGenerator;

    public RegisterCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher _hasher,
        IJwtTokenGenerator jwtGenerator)
    {
        _context = context;
        _passwordHasher = _hasher;
        _jwtGenerator = jwtGenerator;
    }

    public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == request.Email.ToLower(), cancellationToken);

        if (emailExists)
            throw new ConflictException("Email is already registered.");

        var usernameExists = await _context.Users
            .AnyAsync(u => u.Username.ToLower() == request.Username.ToLower(), cancellationToken);

        if (usernameExists)
            throw new ConflictException("Username is already taken.");

        var passwordHash = _passwordHasher.HashPassword(request.Password);

        var user = new User
        {
            Username = request.Username.Trim(),
            DisplayName = request.DisplayName.Trim(),
            Email = request.Email.Trim().ToLower(),
            PasswordHash = passwordHash,
            Status = UserStatus.Online
        };

        _context.Users.Add(user);

        var (refreshTokenString, refreshExpiry) = _jwtGenerator.GenerateRefreshToken();
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenString,
            ExpiresAt = refreshExpiry
        };
        _context.RefreshTokens.Add(refreshToken);

        await _context.SaveChangesAsync(cancellationToken);

        var accessToken = _jwtGenerator.GenerateAccessToken(user.Id, user.Username, user.Email);

        var userDto = new UserDto(
            user.Id,
            user.Username,
            user.DisplayName,
            user.Email,
            user.AvatarUrl,
            user.Status,
            user.CustomStatus
        );

        return new AuthResponseDto(accessToken, refreshToken.Token, refreshToken.ExpiresAt, userDto);
    }
}
