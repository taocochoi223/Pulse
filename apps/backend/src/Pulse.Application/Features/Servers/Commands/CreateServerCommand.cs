using FluentValidation;
using MediatR;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Application.Features.Servers.Dtos;
using Pulse.Domain.Entities;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Servers.Commands;

public record CreateServerCommand(
    string Name,
    string? Description,
    string? IconUrl
) : IRequest<ServerDto>;

public class CreateServerCommandValidator : AbstractValidator<CreateServerCommand>
{
    public CreateServerCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Server name is required.")
            .MaximumLength(100).WithMessage("Server name must not exceed 100 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(500).When(x => !string.IsNullOrEmpty(x.Description));
    }
}

public class CreateServerCommandHandler : IRequestHandler<CreateServerCommand, ServerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateServerCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ServerDto> Handle(CreateServerCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException("User must be logged in to create a server.");

        var inviteCode = Guid.NewGuid().ToString("N")[..8];

        var server = new Server
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            IconUrl = request.IconUrl,
            InviteCode = inviteCode,
            OwnerId = userId
        };

        // Create default general channels
        var generalText = new Channel
        {
            ServerId = server.Id,
            Name = "general",
            Topic = "General discussions",
            Type = ChannelType.Text,
            Position = 0
        };

        var generalVoice = new Channel
        {
            ServerId = server.Id,
            Name = "General Voice",
            Type = ChannelType.Voice,
            Position = 1
        };

        // Add creator as member
        var ownerMembership = new Member
        {
            ServerId = server.Id,
            UserId = userId,
            JoinedAt = DateTimeOffset.UtcNow
        };

        // Default Admin Role
        var adminRole = new Role
        {
            ServerId = server.Id,
            Name = "Admin",
            ColorHex = "#6366f1",
            Permissions = long.MaxValue,
            Position = 0,
            IsMentionable = true
        };

        server.Channels.Add(generalText);
        server.Channels.Add(generalVoice);
        server.Members.Add(ownerMembership);
        server.Roles.Add(adminRole);

        _context.Servers.Add(server);
        await _context.SaveChangesAsync(cancellationToken);

        var channelDtos = new List<ChannelDto>
        {
            new(generalText.Id, generalText.ServerId, generalText.Name, generalText.Topic, generalText.Type, generalText.Position, generalText.CreatedAt),
            new(generalVoice.Id, generalVoice.ServerId, generalVoice.Name, generalVoice.Topic, generalVoice.Type, generalVoice.Position, generalVoice.CreatedAt)
        };

        return new ServerDto(
            server.Id,
            server.Name,
            server.Description,
            server.IconUrl,
            server.InviteCode,
            server.OwnerId,
            server.CreatedAt,
            1,
            channelDtos
        );
    }
}
