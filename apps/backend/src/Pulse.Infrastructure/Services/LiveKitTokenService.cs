using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Pulse.Application.Common.Interfaces;

namespace Pulse.Infrastructure.Services;

public class LiveKitTokenService : ILiveKitTokenService
{
    private readonly IConfiguration _configuration;

    public LiveKitTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateJoinToken(
        string roomName,
        string participantIdentity,
        string participantName,
        bool canPublish = true,
        bool canSubscribe = true)
    {
        var apiKey = _configuration["LiveKit:ApiKey"] ?? "devkey";
        var apiSecret = _configuration["LiveKit:ApiSecret"] ?? "secretpulsekey1234567890abcdef";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(apiSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var videoGrant = new
        {
            room = roomName,
            roomJoin = true,
            canPublish = canPublish,
            canSubscribe = canSubscribe,
            canPublishData = true
        };

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, participantIdentity),
            new(JwtRegisteredClaimNames.Iss, apiKey),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("name", participantName),
            new("video", JsonSerializer.Serialize(videoGrant), JsonClaimValueTypes.Json)
        };

        var token = new JwtSecurityToken(
            issuer: apiKey,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(6),
            notBefore: DateTime.UtcNow.AddMinutes(-1),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

