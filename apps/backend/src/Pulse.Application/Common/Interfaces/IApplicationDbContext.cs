using Microsoft.EntityFrameworkCore;
using Pulse.Domain.Entities;

namespace Pulse.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Server> Servers { get; }
    DbSet<Channel> Channels { get; }
    DbSet<Message> Messages { get; }
    DbSet<Attachment> Attachments { get; }
    DbSet<Member> Members { get; }
    DbSet<Role> Roles { get; }
    DbSet<MemberRole> MemberRoles { get; }
    DbSet<RefreshToken> RefreshTokens { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

