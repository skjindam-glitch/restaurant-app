using System.Net;
using System.Text.Json;

namespace RestoAPI.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await WriteErrorAsync(context, ex);
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = ex switch
        {
            ArgumentException  => (HttpStatusCode.BadRequest,           ex.Message),
            InvalidOperationException => (HttpStatusCode.UnprocessableEntity, ex.Message),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden,   ex.Message),
            _                  => (HttpStatusCode.InternalServerError,  "An unexpected error occurred."),
        };

        context.Response.StatusCode = (int)statusCode;

        var body = JsonSerializer.Serialize(new { message }, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        });

        await context.Response.WriteAsync(body);
    }
}
