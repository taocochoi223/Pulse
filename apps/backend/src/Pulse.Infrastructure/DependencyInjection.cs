using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pulse.Application.Common.Interfaces;
using Pulse.Infrastructure.Authentication;
using Pulse.Infrastructure.Persistence;
using Pulse.Infrastructure.Services;
using StackExchange.Redis;

namespace Pulse.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // PostgreSQL DbContext
        var connectionString = configuration.GetConnectionString("PostgreSql")
            ?? "Host=localhost;Port=5432;Database=pulse_db;Username=pulse_admin;Password=pulse_secure_password_123!;";

        services.AddDbContext<PulseDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(PulseDbContext).Assembly.FullName)));

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<PulseDbContext>());

        // Redis ConnectionMultiplexer
        var redisConnectionString = configuration.GetConnectionString("Redis") ?? "localhost:6379,abortConnect=false";
        services.AddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redisConnectionString));
        services.AddScoped<IRedisPresenceService, RedisPresenceService>();

        // Auth & Security
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // Media SFU
        services.AddScoped<ILiveKitTokenService, LiveKitTokenService>();

        return services;
    }
}
