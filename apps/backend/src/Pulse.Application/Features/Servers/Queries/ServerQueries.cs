using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Application.Features.Servers.Dtos;

namespace Pulse.Application.Features.Servers.Queries;

public record GetUserServersQuery : IRequest<IReadOnlyList<ServerDto>>;

public class GetUserServersQueryHandler : IRequestHandler<GetUserServersQuery, IReadOnlyList<ServerDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetUserServersQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<IReadOnlyList<ServerDto>> Handle(GetUserServersQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var servers = await _context.Members
            .Where(m => m.UserId == userId)
            .Select(m => m.Server)
            .Where(s => !s.IsDeleted)
            .Select(s => new ServerDto(
                s.Id,
                s.Name,
                s.Description,
                s.IconUrl,
                s.InviteCode,
                s.OwnerId,
                s.CreatedAt,
                s.Members.Count,
                null
            ))
            .ToListAsync(cancellationToken);

        return servers;
    }
}

public record GetServerDetailsQuery(Guid ServerId) : IRequest<ServerDto>;

public class GetServerDetailsQueryHandler : IRequestHandler<GetServerDetailsQuery, ServerDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetServerDetailsQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ServerDto> Handle(GetServerDetailsQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == request.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        var server = await _context.Servers
            .Include(s => s.Channels.Where(c => !c.IsDeleted).OrderBy(c => c.Position))
            .Include(s => s.Members)
            .FirstOrDefaultAsync(s => s.Id == request.ServerId && !s.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Server", request.ServerId);

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
