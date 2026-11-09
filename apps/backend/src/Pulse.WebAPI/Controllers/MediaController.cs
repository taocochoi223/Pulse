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
    private readonly IWebHostEnvironment _env;

    public MediaController(
        ILiveKitTokenService liveKitTokenService,
        ICurrentUserService currentUserService,
        IWebHostEnvironment env)
    {
        _liveKitTokenService = liveKitTokenService;
        _currentUserService = currentUserService;
        _env = env;
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

    [HttpPost("upload")]
    [RequestSizeLimit(25 * 1024 * 1024)] // 25MB max
    public async Task<ActionResult<object>> UploadFile(IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            throw new ValidationException(new Dictionary<string, string[]>
            {
                ["file"] = ["File is empty or missing."]
            });

        var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = Path.Combine(webRoot, "uploads");
        Directory.CreateDirectory(uploadsFolder);

        var safeOriginalName = Path.GetFileName(file.FileName);
        var ext = Path.GetExtension(safeOriginalName);
        var storedFileName = $"{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsFolder, storedFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var fileUrl = $"{baseUrl}/uploads/{storedFileName}";

        return Ok(new
        {
            FileName = safeOriginalName,
            ContentType = file.ContentType ?? "application/octet-stream",
            FileSizeBytes = file.Length,
            FileUrl = fileUrl
        });
    }
}
