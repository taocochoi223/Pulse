using FluentAssertions;
using Moq;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Commands;
using Pulse.Domain.Entities;
using Xunit;

namespace Pulse.Application.UnitTests.Features.Auth;

public class RegisterCommandHandlerTests
{
    private readonly Mock<IPasswordHasher> _passwordHasherMock = new();
    private readonly Mock<IJwtTokenGenerator> _jwtGeneratorMock = new();

    public RegisterCommandHandlerTests()
    {
        _passwordHasherMock.Setup(x => x.HashPassword(It.IsAny<string>()))
            .Returns("hashed_password_123");

        _jwtGeneratorMock.Setup(x => x.GenerateAccessToken(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns("mock_access_token");

        _jwtGeneratorMock.Setup(x => x.GenerateRefreshToken())
            .Returns(("mock_refresh_token", DateTimeOffset.UtcNow.AddDays(7)));
    }

    [Fact]
    public async Task Handle_ValidRequest_CreatesUserAndReturnsAuthDto()
    {
        // Arrange
        using var context = TestDbContextFactory.Create();
        var handler = new RegisterCommandHandler(context, _passwordHasherMock.Object, _jwtGeneratorMock.Object);
        var command = new RegisterCommand("tri_dev", "Trí", "tri@pulse.local", "StrongP@ssw0rd!");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.AccessToken.Should().Be("mock_access_token");
        result.RefreshToken.Should().Be("mock_refresh_token");
        result.User.Username.Should().Be("tri_dev");
        result.User.DisplayName.Should().Be("Trí");
        result.User.Email.Should().Be("tri@pulse.local");

        context.Users.Should().ContainSingle(u => u.Email == "tri@pulse.local");
    }

    [Fact]
    public async Task Handle_DuplicateEmail_ThrowsConflictException()
    {
        // Arrange
        using var context = TestDbContextFactory.Create();
        context.Users.Add(new User
        {
            Username = "existing_user",
            Email = "duplicate@pulse.local",
            PasswordHash = "hashed"
        });
        await context.SaveChangesAsync();

        var handler = new RegisterCommandHandler(context, _passwordHasherMock.Object, _jwtGeneratorMock.Object);
        var command = new RegisterCommand("new_user", "New User", "duplicate@pulse.local", "StrongP@ssw0rd!");

        // Act & Assert
        await Assert.ThrowsAsync<ConflictException>(() => handler.Handle(command, CancellationToken.None));
    }
}
