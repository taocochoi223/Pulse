using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Dtos;

namespace Pulse.Application.Features.Channels.Queries;

public record GetServerChannelsQuery(Guid ServerId) : IRequest<IReadOnlyList<ChannelDto>>;

public class GetServerChannelsQueryHandler : IRequestHandler<GetServerChannelsQuery, IReadOnlyList<ChannelDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetServerChannelsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<IReadOnlyList<ChannelDto>> Handle(GetServerChannelsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        var channels = await _context.Channels
            .Where(c => c.ServerId == request.ServerId && !c.IsDeleted)
            .OrderBy(c => c.Position)
            .Select(c => new ChannelDto(
                c.Id,
                c.ServerId,
                c.Name,
                c.Topic,
                c.Type,
                c.Position,
                c.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return channels;
    }
}
