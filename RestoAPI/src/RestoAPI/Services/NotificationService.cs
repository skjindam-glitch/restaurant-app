using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.Models;

namespace RestoAPI.Services;

public class NotificationDto
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? TargetRole { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateAlertRequest
{
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? TargetRole { get; set; }
}

public interface INotificationService
{
    Task<List<NotificationDto>> GetRecentAsync(string userRole, int limit = 50);
    Task<NotificationDto> CreateAlertAsync(int createdById, CreateAlertRequest request);
    Task<bool> MarkReadAsync(int id);
    Task MarkAllReadAsync(string userRole);
}

public class NotificationService(AppDbContext db) : INotificationService
{
    public async Task<List<NotificationDto>> GetRecentAsync(string userRole, int limit = 50)
    {
        return await db.Notifications
            .Include(n => n.CreatedBy)
            .Where(n => n.TargetRole == null || n.TargetRole == userRole)
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .AsNoTracking()
            .Select(n => new NotificationDto
            {
                Id            = n.Id,
                Type          = n.Type,
                Title         = n.Title,
                Message       = n.Message,
                TargetRole    = n.TargetRole,
                CreatedByName = n.CreatedBy.Name,
                IsRead        = n.IsRead,
                CreatedAt     = n.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<NotificationDto> CreateAlertAsync(int createdById, CreateAlertRequest request)
    {
        var notification = new Notification
        {
            Type        = "manager_alert",
            Title       = request.Title,
            Message     = request.Message,
            TargetRole  = request.TargetRole,
            CreatedById = createdById,
        };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();

        var creator = await db.Users.FindAsync(createdById);
        return new NotificationDto
        {
            Id            = notification.Id,
            Type          = notification.Type,
            Title         = notification.Title,
            Message       = notification.Message,
            TargetRole    = notification.TargetRole,
            CreatedByName = creator?.Name ?? "Manager",
            IsRead        = false,
            CreatedAt     = notification.CreatedAt,
        };
    }

    public async Task<bool> MarkReadAsync(int id)
    {
        var n = await db.Notifications.FindAsync(id);
        if (n is null) return false;
        n.IsRead = true;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task MarkAllReadAsync(string userRole)
    {
        var notifications = await db.Notifications
            .Where(n => !n.IsRead && (n.TargetRole == null || n.TargetRole == userRole))
            .ToListAsync();
        foreach (var n in notifications) n.IsRead = true;
        await db.SaveChangesAsync();
    }
}
