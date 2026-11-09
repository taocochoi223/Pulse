using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Channels.Commands;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Application.Features.Channels.Queries;
using Pulse.Domain.Enums;

namespace Pulse.WebAPI.Controllers;

public record UpdateChannelRequest(string Name, string? Topic);

[Authorize]
public class ChannelController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ChannelController(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    public async Task<ActionResult<ChannelDto>> CreateChannel([FromBody] CreateChannelCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpGet("server/{serverId:guid}")]
    public async Task<ActionResult<IReadOnlyList<ChannelDto>>> GetServerChannels(Guid serverId)
    {
        var result = await Mediator.Send(new GetServerChannelsQuery(serverId));
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ChannelDto>> UpdateChannel(
        Guid id,
        [FromBody] UpdateChannelRequest request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedException();

        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Channel", id);

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == channel.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            var trimmed = request.Name.Trim();
            channel.Name = channel.Type == ChannelType.Text
                ? trimmed.ToLower().Replace(' ', '-')
                : trimmed;
        }

        channel.Topic = string.IsNullOrWhiteSpace(request.Topic) ? null : request.Topic.Trim();
        channel.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new ChannelDto(
            channel.Id,
            channel.ServerId,
            channel.Name,
            channel.Topic,
            channel.Type,
            channel.Position,
            channel.CreatedAt
        ));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteChannel(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedException();

        var channel = await _context.Channels
            .Include(c => c.Server)
            .FirstOrDefaultAsync(c => c.Id == id && !c.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Channel", id);

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == channel.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        channel.IsDeleted = true;
        channel.UpdatedAt = DateTimeOffset.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
