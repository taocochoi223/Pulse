using Pulse.Domain.Entities;
using Pulse.Domain.Enums;
using Xunit;

namespace Pulse.Domain.UnitTests.Entities;

public class UserEntityTests
{
    [Fact]
    public void CreateUser_ShouldInitializeWithDefaultValues()
    {
        // Act
        var user = new User
        {
            Username = "tridev",
            DisplayName = "Trí",
            Email = "tri@example.com",
            PasswordHash = "hashed_secret"
        };

        // Assert
        Assert.NotEqual(Guid.Empty, user.Id);
        Assert.Equal(UserStatus.Offline, user.Status);
        Assert.Empty(user.Memberships);
        Assert.Empty(user.OwnedServers);
        Assert.True(user.CreatedAt <= DateTimeOffset.UtcNow);
    }

    [Fact]
    public void RefreshToken_WhenExpiredOrRevoked_IsActiveReturnsFalse()
    {
        // Arrange
        var token = new RefreshToken
        {
            Token = "sample_refresh_token",
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-5),
            IsRevoked = false
        };

        // Assert
        Assert.False(token.IsActive);

        // Revoke active token
        token.ExpiresAt = DateTimeOffset.UtcNow.AddDays(1);
        token.IsRevoked = true;
        Assert.False(token.IsActive);
    }
}

