using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Domain.Entities;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Channels.Commands;

public record CreateChannelCommand(
    Guid ServerId,
    string Name,
    string? Topic,
    ChannelType Type
) : IRequest<ChannelDto>;

public class CreateChannelCommandValidator : AbstractValidator<CreateChannelCommand>
{
    public CreateChannelCommandValidator()
    {
        RuleFor(x => x.ServerId).NotEmpty();
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Channel name is required.")
            .MaximumLength(100).WithMessage("Channel name must not exceed 100 characters.")
            .Matches("^[a-zA-Z0-9_-]+$").WithMessage("Channel name must be alphanumeric with '-' or '_'");
    }
}

public class CreateChannelCommandHandler : IRequestHandler<CreateChannelCommand, ChannelDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CreateChannelCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ChannelDto> Handle(CreateChannelCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        var highestPosition = await _context.Channels
            .Where(c => c.ServerId == request.ServerId && !c.IsDeleted)
            .Select(c => (int?)c.Position)
            .MaxAsync(cancellationToken) ?? -1;

        var channel = new Channel
        {
            ServerId = request.ServerId,
            Name = request.Name.Trim().ToLower(),
            Topic = request.Topic?.Trim(),
            Type = request.Type,
            Position = highestPosition + 1
        };

        _context.Channels.Add(channel);
        await _context.SaveChangesAsync(cancellationToken);

        return new ChannelDto(
            channel.Id,
            channel.ServerId,
            channel.Name,
            channel.Topic,
            channel.Type,
            channel.Position,
            channel.CreatedAt
        );
    }
}

