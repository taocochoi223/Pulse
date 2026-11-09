using System.Net;
using System.Text.Json;
using Pulse.Application.Common.Exceptions;

namespace Pulse.WebAPI.Middlewares;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = HttpStatusCode.InternalServerError;
        var response = new Dictionary<string, object?>
        {
            ["status"] = (int)statusCode,
            ["title"] = "An error occurred while processing your request.",
            ["detail"] = exception.Message
        };

        switch (exception)
        {
            case ValidationException validationEx:
                statusCode = HttpStatusCode.BadRequest;
                response["status"] = (int)statusCode;
                response["title"] = "Validation Error";
                response["errors"] = validationEx.Errors;
                _logger.LogWarning("Validation failure: {Errors}", JsonSerializer.Serialize(validationEx.Errors));
                break;

            case UnauthorizedException:
                statusCode = HttpStatusCode.Unauthorized;
                response["status"] = (int)statusCode;
                response["title"] = "Unauthorized";
                _logger.LogWarning("Unauthorized access attempt: {Message}", exception.Message);
                break;

            case NotFoundException:
                statusCode = HttpStatusCode.NotFound;
                response["status"] = (int)statusCode;
                response["title"] = "Not Found";
                break;

            case ConflictException:
                statusCode = HttpStatusCode.Conflict;
                response["status"] = (int)statusCode;
                response["title"] = "Conflict";
                break;

            default:
                _logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);
                response["title"] = "Internal Server Error";
                response["detail"] = "An unexpected error occurred. Please try again later.";
                break;
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}

