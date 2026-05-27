using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController(INotificationService notificationService) : ControllerBase
{
    /// <summary>Get recent notifications for the current user's role.</summary>
    [HttpGet]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 50)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "server";
        return Ok(await notificationService.GetRecentAsync(role, limit));
    }

    /// <summary>Manager/admin sends an alert to staff.</summary>
    [HttpPost("alert")]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> CreateAlert([FromBody] CreateAlertRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await notificationService.CreateAlertAsync(userId, request);
        return Ok(result);
    }

    /// <summary>Mark a single notification as read.</summary>
    [HttpPatch("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        var success = await notificationService.MarkReadAsync(id);
        return success ? Ok() : NotFound();
    }

    /// <summary>Mark all notifications as read for the current user's role.</summary>
    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? "server";
        await notificationService.MarkAllReadAsync(role);
        return Ok();
    }
}
