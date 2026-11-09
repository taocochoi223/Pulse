using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Pulse.Application.Common.Exceptions;
using Pulse.Application.Common.Interfaces;
using Pulse.Application.Features.Auth.Dtos;
using Pulse.Application.Features.Messages.Dtos;
using Pulse.Domain.Entities;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Messages.Commands;

public record AttachmentInputDto(
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string FileUrl,
    int? Width = null,
    int? Height = null
);

public record SendMessageCommand(
    Guid ChannelId,
    string Content,
    Guid? ReplyToMessageId = null,
    IReadOnlyList<AttachmentInputDto>? Attachments = null
) : IRequest<MessageDto>;

public class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public SendMessageCommandValidator()
    {
        RuleFor(x => x.ChannelId).NotEmpty();
        RuleFor(x => x)
            .Must(x => !string.IsNullOrWhiteSpace(x.Content) || (x.Attachments != null && x.Attachments.Count > 0))
            .WithMessage("Message must contain text or at least one attachment.");
        RuleFor(x => x.Content)
            .MaximumLength(4000).WithMessage("Message cannot exceed 4000 characters.");
    }
}

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, MessageDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISignalRNotifier _signalRNotifier;

    public SendMessageCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        ISignalRNotifier signalRNotifier)
    {
        _context = context;
        _currentUserService = currentUserService;
        _signalRNotifier = signalRNotifier;
    }

    public async Task<MessageDto> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException();

        var channel = await _context.Channels
            .Include(c => c.Server)
            .FirstOrDefaultAsync(c => c.Id == request.ChannelId && !c.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Channel", request.ChannelId);

        var isMember = await _context.Members
            .AnyAsync(m => m.ServerId == channel.ServerId && m.UserId == userId, cancellationToken);

        if (!isMember)
            throw new UnauthorizedException("You are not a member of this server.");

        var sender = await _context.Users
            .FirstAsync(u => u.Id == userId, cancellationToken);

        var message = new Message
        {
            ChannelId = request.ChannelId,
            SenderId = userId,
            Content = (request.Content ?? string.Empty).Trim(),
            Type = request.ReplyToMessageId.HasValue ? MessageType.Reply : MessageType.Default,
            ReplyToMessageId = request.ReplyToMessageId,
            IsPinned = false,
            IsEdited = false
        };

        var attachmentDtos = new List<AttachmentDto>();
        if (request.Attachments != null && request.Attachments.Count > 0)
        {
            foreach (var item in request.Attachments)
            {
                var attachment = new Attachment
                {
                    MessageId = message.Id,
                    FileName = item.FileName,
                    ContentType = item.ContentType,
                    FileSizeBytes = item.FileSizeBytes,
                    FileUrl = item.FileUrl,
                    Width = item.Width,
                    Height = item.Height
                };
                message.Attachments.Add(attachment);
                attachmentDtos.Add(new AttachmentDto(
                    attachment.Id,
                    attachment.FileName,
                    attachment.ContentType,
                    attachment.FileSizeBytes,
                    attachment.FileUrl,
                    attachment.Width,
                    attachment.Height
                ));
            }
        }

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        var userDto = new UserDto(
            sender.Id,
            sender.Username,
            sender.DisplayName,
            sender.Email,
            sender.AvatarUrl,
            sender.Status,
            sender.CustomStatus
        );

        var messageDto = new MessageDto(
            message.Id,
            message.ChannelId,
            userDto,
            message.Content,
            message.Type,
            message.ReplyToMessageId,
            message.IsPinned,
            message.IsEdited,
            message.CreatedAt,
            message.UpdatedAt,
            attachmentDtos
        );

        // Broadcast to channel room in real-time
        await _signalRNotifier.NotifyMessageCreatedAsync(channel.Id, messageDto, cancellationToken);

        return messageDto;
    }
}
