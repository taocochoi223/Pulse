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
        // 1. PostgreSQL DbContext from .env or Configuration
        var rawDbUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? Environment.GetEnvironmentVariable("POSTGRES_DB_URI")
            ?? configuration["DATABASE_URL"]
            ?? configuration.GetConnectionString("PostgreSql")
            ?? "Host=localhost;Port=5432;Database=pulse_db;Username=pulse_admin;Password=pulse_secure_password_123!;";

        if (rawDbUrl == "InMemory")
        {
            services.AddDbContext<PulseDbContext>(options =>
                options.UseInMemoryDatabase("PulseIntegrationTestDb"));
        }
        else
        {
            var npgsqlConnectionString = ParsePostgresConnectionString(rawDbUrl);
            services.AddDbContext<PulseDbContext>(options =>
                options.UseNpgsql(npgsqlConnectionString, b => b.MigrationsAssembly(typeof(PulseDbContext).Assembly.FullName)));
        }

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<PulseDbContext>());

        // 2. Hybrid Redis + In-Memory Presence Service (fast startup even when Redis is offline)
        var redisConn = Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING")
            ?? configuration["REDIS_CONNECTION_STRING"]
            ?? configuration.GetConnectionString("Redis");

        if (!string.IsNullOrWhiteSpace(redisConn) && !redisConn.StartsWith("localhost:6379"))
        {
            try
            {
                var options = ConfigurationOptions.Parse(redisConn);
                options.AbortOnConnectFail = false;
                options.ConnectTimeout = 1000;
                var multiplexer = ConnectionMultiplexer.Connect(options);
                services.AddSingleton<IConnectionMultiplexer>(multiplexer);
            }
            catch
            {
                // Redis unavailable; RedisPresenceService will use In-Memory store
            }
        }

        services.AddScoped<IRedisPresenceService, RedisPresenceService>();

        // 3. Auth & Security
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();

        // 4. Media SFU
        services.AddScoped<ILiveKitTokenService, LiveKitTokenService>();

        return services;
    }

    public static string ParsePostgresConnectionString(string connectionStringOrUri)
    {
        if (connectionStringOrUri.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            connectionStringOrUri.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var uri = new Uri(connectionStringOrUri);
            var userInfo = uri.UserInfo.Split(':', 2);
            var username = Uri.UnescapeDataString(userInfo[0]);
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
            var port = uri.Port > 0 ? uri.Port : 5432;
            var database = uri.AbsolutePath.TrimStart('/');
            if (string.IsNullOrEmpty(database)) database = "postgres";

            return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
        }

        return connectionStringOrUri;
    }
}
