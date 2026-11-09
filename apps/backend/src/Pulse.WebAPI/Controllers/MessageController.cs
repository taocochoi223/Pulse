using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulse.Application.Features.Messages.Commands;
using Pulse.Application.Features.Messages.Dtos;
using Pulse.Application.Features.Messages.Queries;

namespace Pulse.WebAPI.Controllers;

[Authorize]
public class MessageController : ApiControllerBase
{
    [HttpPost]
    public async Task<ActionResult<MessageDto>> SendMessage([FromBody] SendMessageCommand command)
    {
        var result = await Mediator.Send(command);
        return Ok(result);
    }

    [HttpGet("channel/{channelId:guid}")]
    public async Task<ActionResult<ChannelMessagesResponse>> GetChannelMessages(
        Guid channelId,
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = 50)
    {
        var result = await Mediator.Send(new GetChannelMessagesQuery(channelId, cursor, limit));
        return Ok(result);
    }
}
