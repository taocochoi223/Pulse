using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Dtos;
using Pulse.Application.Features.Messages.Dtos;

namespace Pulse.Application.Features.Messages.Queries;

public record GetChannelMessagesQuery(
    Guid ChannelId,
    string? Cursor = null,
    int Limit = 50
) : IRequest<ChannelMessagesResponse>;

public class GetChannelMessagesQueryHandler : IRequestHandler<GetChannelMessagesQuery, ChannelMessagesResponse>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetChannelMessagesQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<ChannelMessagesResponse> Handle(GetChannelMessagesQuery request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId && !c.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Channel", request.ChannelId);

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == channel.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        var query = _context.Messages
            .Where(m => m.ChannelId == request.ChannelId && !m.IsDeleted);

        // Cursor parsing (ISO 8601 string)
        if (!string.IsNullOrEmpty(request.Cursor) && DateTimeOffset.TryParse(request.Cursor, out var cursorDate))
        {
            query = query.Where(m => m.CreatedAt < cursorDate);
        }

        var pageSize = Math.Clamp(request.Limit, 1, 100);

        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(pageSize + 1)
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .ToListAsync(cancellationToken);

        var hasMore = messages.Count > pageSize;
        if (hasMore)
        {
            messages.RemoveAt(messages.Count - 1);
        }

        var nextCursor = hasMore && messages.Count > 0
            ? messages[^1].CreatedAt.ToString("O")
            : null;

        var messageDtos = messages.Select(m => new MessageDto(
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
        )).ToList();

        return new ChannelMessagesResponse(messageDtos, nextCursor, hasMore);
    }
}
