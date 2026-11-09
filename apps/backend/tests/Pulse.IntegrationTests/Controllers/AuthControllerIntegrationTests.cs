using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Pulse.Application.Features.Auth.Commands;
using Pulse.Application.Features.Auth.Dtos;
using Xunit;

namespace Pulse.IntegrationTests.Controllers;

public class AuthControllerIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public AuthControllerIntegrationTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Register_And_Login_FullFlow_Succeeds()
    {
        // 1. Register new user
        var uniqueEmail = $"user_{Guid.NewGuid():N}@pulse.local";
        var uniqueUsername = $"user_{Guid.NewGuid():N}"[..12];

        var registerCommand = new RegisterCommand(
            Username: uniqueUsername,
            DisplayName: "Test User",
            Email: uniqueEmail,
            Password: "SecurePassword123!"
        );

        var registerResponse = await _client.PostAsJsonAsync("/api/v1/auth/register", registerCommand);
        registerResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var authResult = await registerResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        authResult.Should().NotBeNull();
        authResult!.AccessToken.Should().NotBeNullOrWhiteSpace();
        authResult.RefreshToken.Should().NotBeNullOrWhiteSpace();
        authResult.User.Email.Should().Be(uniqueEmail);

        // 2. Login with registered user
        var loginCommand = new LoginCommand(
            EmailOrUsername: uniqueEmail,
            Password: "SecurePassword123!"
        );

        var loginResponse = await _client.PostAsJsonAsync("/api/v1/auth/login", loginCommand);
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginResult = await loginResponse.Content.ReadFromJsonAsync<AuthResponseDto>();
        loginResult.Should().NotBeNull();
        loginResult!.AccessToken.Should().NotBeNullOrWhiteSpace();

        // 3. Test Authorized endpoint /api/v1/auth/me
        using var authenticatedClient = _factory.CreateClient();
        authenticatedClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginResult.AccessToken);
        var meResponse = await authenticatedClient.GetAsync("/api/v1/auth/me");
        meResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Access_ProtectedEndpoint_WithoutToken_ReturnsUnauthorized()
    {
        using var unauthenticatedClient = _factory.CreateClient();
        var response = await unauthenticatedClient.GetAsync("/api/v1/auth/me");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
