using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Application.Features.Servers.Dtos;
using Pulse.Domain.Entities;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Servers.Commands;

public record JoinServerCommand(
    string InviteCode
) : IRequest<ServerDto>;

public class JoinServerCommandValidator : AbstractValidator<JoinServerCommand>
{
    public JoinServerCommandValidator()
    {
        RuleFor(x => x.InviteCode)
            .NotEmpty().WithMessage("Invite code is required.")
            .MaximumLength(32).WithMessage("Invite code cannot exceed 32 characters.");
    }
}

public class JoinServerCommandHandler : IRequestHandler<JoinServerCommand, ServerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public JoinServerCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ServerDto> Handle(JoinServerCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException("User must be logged in to join a server.");

        var normalizedCode = request.InviteCode.Trim();

        var server = await _context.Servers
            .Include(s => s.Channels.Where(c => !c.IsDeleted).OrderBy(c => c.Position))
            .Include(s => s.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(s => s.InviteCode.ToLower() == normalizedCode.ToLower() && !s.IsDeleted, cancellationToken)
            ?? throw new NotFoundException($"Server with invite code '{request.InviteCode}' not found.");

        var existingMember = server.Members.FirstOrDefault(m => m.UserId == userId);
        if (existingMember == null)
        {
            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            var newMembership = new Member
            {
                ServerId = server.Id,
                UserId = userId,
                User = currentUser!,
                JoinedAt = DateTimeOffset.UtcNow
            };

            _context.Members.Add(newMembership);
            await _context.SaveChangesAsync(cancellationToken);
            server.Members.Add(newMembership);
        }

        var channels = server.Channels
            .Select(c => new ChannelDto(c.Id, c.ServerId, c.Name, c.Topic, c.Type, c.Position, c.CreatedAt))
            .ToList();

        var members = server.Members
            .Where(m => m.User != null)
            .Select(m => new MemberDto(
                m.Id,
                m.UserId,
                m.User.Username,
                m.User.DisplayName,
                m.Nickname,
                m.User.AvatarUrl,
                m.User.Status == UserStatus.Offline ? UserStatus.Online : m.User.Status,
                m.User.CustomStatus,
                m.UserId == server.OwnerId,
                m.JoinedAt
            ))
            .OrderByDescending(m => m.IsOwner)
            .ThenBy(m => m.DisplayName)
            .ToList();

        return new ServerDto(
            server.Id,
            server.Name,
            server.Description,
            server.IconUrl,
            server.InviteCode,
            server.OwnerId,
            server.CreatedAt,
            members.Count,
            channels,
            members
        );
    }
}
