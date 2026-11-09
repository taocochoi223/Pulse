using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Dtos;
using Pulse.Application.Features.Messages.Commands;
using Pulse.Application.Features.Messages.Dtos;
using Pulse.Application.Features.Messages.Queries;

namespace Pulse.WebAPI.Controllers;

public record EditMessageRequest(string Content);

[Authorize]
public class MessageController : ApiControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISignalRNotifier _signalRNotifier;

    public MessageController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ISignalRNotifier signalRNotifier)
    {
        _context = context;
        _currentUserService = currentUserService;
        _signalRNotifier = signalRNotifier;
    }

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

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<MessageDto>> EditMessage(Guid id, [FromBody] EditMessageRequest request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedException();

        var message = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Message", id);

        if (message.SenderId != userId)
            throw new UnauthorizedException("You can only edit your own messages.");

        message.Content = request.Content.Trim();
        message.IsEdited = true;
        message.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var dto = MapToDto(message);
        await _signalRNotifier.NotifyMessageUpdatedAsync(message.ChannelId, dto, cancellationToken);

        return Ok(dto);
    }

    [HttpPost("{id:guid}/pin")]
    public async Task<ActionResult<MessageDto>> TogglePinMessage(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedException();

        var message = await _context.Messages
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.Channel)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Message", id);

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == message.Channel.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        message.IsPinned = !message.IsPinned;
        message.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        var dto = MapToDto(message);
        await _signalRNotifier.NotifyMessageUpdatedAsync(message.ChannelId, dto, cancellationToken);

        return Ok(dto);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteMessage(Guid id, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId ?? throw new UnauthorizedException();

        var message = await _context.Messages
            .Include(m => m.Channel)
                .ThenInclude(c => c.Server)
            .FirstOrDefaultAsync(m => m.Id == id && !m.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Message", id);

        if (message.SenderId != userId && message.Channel.Server.OwnerId != userId)
            throw new UnauthorizedException("You can only delete your own messages.");

        message.IsDeleted = true;
        message.UpdatedAt = DateTimeOffset.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        await _signalRNotifier.NotifyMessageDeletedAsync(message.ChannelId, message.Id, cancellationToken);

        return NoContent();
    }

    private static MessageDto MapToDto(Pulse.Domain.Entities.Message m) =>
        new(
            m.Id,
            m.ChannelId,
            new UserDto(
                m.Sender.Id,
                m.Sender.Username,
                m.Sender.DisplayName,
                m.Sender.Email,
                m.Sender.AvatarUrl,
                m.Sender.Status,
                m.Sender.CustomStatus
            ),
            m.Content,
            m.Type,
            m.ReplyToMessageId,
            m.IsPinned,
            m.IsEdited,
            m.CreatedAt,
            m.UpdatedAt,
            m.Attachments.Select(a => new AttachmentDto(
                a.Id,
                a.FileName,
                a.ContentType,
                a.FileSizeBytes,
                a.FileUrl,
                a.Width,
                a.Height
            )).ToList()
        );
}
