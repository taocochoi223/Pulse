using FluentAssertions;
using Moq;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Messages.Commands;
using Pulse.Domain.Entities;
using Pulse.Domain.Enums;
using Xunit;

namespace Pulse.Application.UnitTests.Features.Messages;

public class SendMessageCommandHandlerTests
{
    private readonly Mock<ICurrentUserService> _currentUserServiceMock = new();
    private readonly Mock<ISignalRNotifier> _signalRNotifierMock = new();

    [Fact]
    public async Task Handle_WhenUserIsMember_SendsMessageAndNotifiesSignalR()
    {
        // Arrange
        using var context = TestDbContextFactory.Create();

        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Username = "sender_user",
            DisplayName = "Sender",
            Email = "sender@pulse.local",
            PasswordHash = "hashed"
        };
        var server = new Server
        {
            Name = "Dev Hub",
            OwnerId = userId,
            InviteCode = "devhub01"
        };
        var channel = new Channel
        {
            ServerId = server.Id,
            Name = "general",
            Type = ChannelType.Text,
            Position = 0
        };
        var membership = new Member
        {
            ServerId = server.Id,
            UserId = userId
        };

        context.Users.Add(user);
        context.Servers.Add(server);
        context.Channels.Add(channel);
        context.Members.Add(membership);
        await context.SaveChangesAsync();

        _currentUserServiceMock.Setup(x => x.UserId).Returns(userId);

        var handler = new SendMessageCommandHandler(context, _currentUserServiceMock.Object, _signalRNotifierMock.Object);
        var command = new SendMessageCommand(channel.Id, "Hello Pulse team!");

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Content.Should().Be("Hello Pulse team!");
        result.Sender.Id.Should().Be(userId);

        // Verify message was stored in DB
        context.Messages.Should().ContainSingle(m => m.Content == "Hello Pulse team!");

        // Verify SignalR broadcast was invoked
        _signalRNotifierMock.Verify(
            x => x.NotifyMessageCreatedAsync(channel.Id, It.IsAny<object>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task Handle_WhenUserIsNotMember_ThrowsUnauthorizedException()
    {
        // Arrange
        using var context = TestDbContextFactory.Create();

        var ownerId = Guid.NewGuid();
        var nonMemberId = Guid.NewGuid();

        var server = new Server
        {
            Name = "Secret Server",
            OwnerId = ownerId,
            InviteCode = "secret01"
        };
        var channel = new Channel
        {
            ServerId = server.Id,
            Name = "secret-room",
            Type = ChannelType.Text
        };

        context.Servers.Add(server);
        context.Channels.Add(channel);
        await context.SaveChangesAsync();

        _currentUserServiceMock.Setup(x => x.UserId).Returns(nonMemberId);

        var handler = new SendMessageCommandHandler(context, _currentUserServiceMock.Object, _signalRNotifierMock.Object);
        var command = new SendMessageCommand(channel.Id, "Can I join?");

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedException>(() => handler.Handle(command, CancellationToken.None));
    }
}
