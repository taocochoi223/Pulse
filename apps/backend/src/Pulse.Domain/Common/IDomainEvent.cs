namespace Pulse.Domain.Common;

public interface IDomainEvent
{
    DateTimeOffset OccurredOn { get; }
}

