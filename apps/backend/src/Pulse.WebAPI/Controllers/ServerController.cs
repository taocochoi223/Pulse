using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Servers.Commands;
using Pulse.Application.Features.Servers.Dtos;
using Pulse.Application.Features.Servers.Queries;

namespace Pulse.WebAPI.Controllers;

[Authorize]
public class ServerController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ServerController(IApplicationDbContext context, ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    [HttpPost]
    public async Task<ActionResult<ServerDto>> CreateServer([FromBody] CreateServerCommand command)
    {
        var result = await Mediator.Send(command);
        return CreatedAtAction(nameof(GetServerById), new { id = result.Id }, result);
    }

    [HttpPost("join/{inviteCode}")]
    public async Task<ActionResult<ServerDto>> JoinServer(string inviteCode)
    {
        var result = await Mediator.Send(new JoinServerCommand(inviteCode));
        return Ok(result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServerDto>>> GetUserServers()
    {
        var result = await Mediator.Send(new GetUserServersQuery());
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServerDto>> GetServerById(Guid id)
    {
        var result = await Mediator.Send(new GetServerDetailsQuery(id));
        return Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteOrLeaveServer(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedException();

        var server = await _context.Servers
            .Include(s => s.Members)
            .FirstOrDefaultAsync(s => s.Id == id && !s.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Server", id);

        if (server.OwnerId == userId)
        {
            server.IsDeleted = true;
            server.UpdatedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            var member = server.Members.FirstOrDefault(m => m.UserId == userId);
            if (member != null)
            {
                _context.Members.Remove(member);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return NoContent();
    }
}
