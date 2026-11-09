using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulse.Application.Features.Servers.Commands;
using Pulse.Application.Features.Servers.Dtos;
using Pulse.Application.Features.Servers.Queries;

namespace Pulse.WebAPI.Controllers;

[Authorize]
public class ServerController : ApiControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ServerDto>> CreateServer([FromBody] CreateServerCommand command)
    {
        var result = await Mediator.Send(command);
        return CreatedAtAction(nameof(GetServerById), new { id = result.Id }, result);
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
}
