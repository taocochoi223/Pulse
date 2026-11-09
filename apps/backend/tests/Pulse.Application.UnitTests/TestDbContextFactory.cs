using Microsoft.EntityFrameworkCore;
using Pulse.Infrastructure.Persistence;

namespace Pulse.Application.UnitTests;

public static class TestDbContextFactory
{
    public static PulseDbContext Create()
    {
        var options = new DbContextOptionsBuilder<PulseDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var context = new PulseDbContext(options);
        context.Database.EnsureCreated();
        return context;
    }
}

