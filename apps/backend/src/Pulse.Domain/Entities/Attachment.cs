using Pulse.Domain.Common;

namespace Pulse.Domain.Entities;

public class Attachment : BaseEntity
{
    public Guid MessageId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public string FileUrl { get; set; } = string.Empty;
    public int? Width { get; set; }
    public int? Height { get; set; }

    // Navigation properties
    public Message Message { get; set; } = null!;
}
