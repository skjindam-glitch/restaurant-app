namespace RestoAPI.Models;

public class Notification
{
    public int Id { get; set; }

    // Types: order_ready | call_staff | manager_alert | system
    public string Type { get; set; } = "system";

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    // null = broadcast to all; specific role = target role only
    public string? TargetRole { get; set; }

    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
