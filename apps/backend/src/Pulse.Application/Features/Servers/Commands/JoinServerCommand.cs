using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Application.Features.Servers.Dtos;
using Pulse.Domain.Entities;

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

        var server = await _context.Servers
            .Include(s => s.Channels.Where(c => !c.IsDeleted).OrderBy(c => c.Position))
            .Include(s => s.Members)
            .FirstOrDefaultAsync(s => s.InviteCode == request.InviteCode.Trim() && !s.IsDeleted, cancellationToken)
            ?? throw new NotFoundException($"Server with invite code '{request.InviteCode}' not found.");

        var existingMember = server.Members.FirstOrDefault(m => m.UserId == userId);
        if (existingMember == null)
        {
            var newMembership = new Member
            {
                ServerId = server.Id,
                UserId = userId,
                JoinedAt = DateTimeOffset.UtcNow
            };

            server.Members.Add(newMembership);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var channels = server.Channels
            .Select(c => new ChannelDto(c.Id, c.ServerId, c.Name, c.Topic, c.Type, c.Position, c.CreatedAt))
            .ToList();

        return new ServerDto(
            server.Id,
            server.Name,
            server.Description,
            server.IconUrl,
            server.InviteCode,
            server.OwnerId,
            server.CreatedAt,
            server.Members.Count,
            channels
        );
    }
}
