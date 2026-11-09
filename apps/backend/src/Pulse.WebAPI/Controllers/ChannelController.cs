using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulse.Application.Features.Channels.Commands;
using Pulse.Application.Features.Channels.Dtos;
using Pulse.Application.Features.Channels.Queries;

namespace Pulse.WebAPI.Controllers;

[Authorize]
public class ChannelController : ApiControllerBase
{
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
}
