using Pulse.Application.Features.Auth.Dtos;
using Pulse.Domain.Enums;

namespace Pulse.Application.Features.Messages.Dtos;

public record AttachmentDto(
    Guid Id,
    string FileName,
    string ContentType,
    long FileSizeBytes,
    string FileUrl,
    int? Width,
    int? Height
);

public record MessageDto(
    Guid Id,
    Guid ChannelId,
    UserDto Sender,
    string Content,
    MessageType Type,
    Guid? ReplyToMessageId,
    bool IsPinned,
    bool IsEdited,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    IReadOnlyCollection<AttachmentDto> Attachments
);

public record ChannelMessagesResponse(
    IReadOnlyList<MessageDto> Messages,
    string? NextCursor,
    bool HasMore
);
