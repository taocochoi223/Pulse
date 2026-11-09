using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;

namespace Pulse.WebAPI.Controllers;

[Authorize]
public class MediaController : ApiControllerBase
{
    private readonly ILiveKitTokenService _liveKitTokenService;
    private readonly ICurrentUserService _currentUserService;

    public MediaController(
        ILiveKitTokenService liveKitTokenService,
        ICurrentUserService currentUserService)
    {
        _liveKitTokenService = liveKitTokenService;
        _currentUserService = currentUserService;
    }

    [HttpGet("livekit-token")]
    public ActionResult<object> GetLiveKitToken([FromQuery] string roomName)
    {
        if (string.IsNullOrWhiteSpace(roomName))
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["roomName"] = ["Room name is required."]
            });

        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var username = _currentUserService.Username ?? "User";

        var token = _liveKitTokenService.GenerateJoinToken(
            roomName: roomName,
            participantIdentity: userId.ToString(),
            participantName: username,
            canPublish: true,
            canSubscribe: true
        );

        return Ok(new
        {
            Token = token,
            RoomName = roomName,
            Identity = userId.ToString()
        });
    }
}

