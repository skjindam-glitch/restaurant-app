namespace RestoAPI.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;

    // Roles: manager | server | cashier | kitchen | admin
    public string Role { get; set; } = string.Empty;

    // Stored by admin for credential management (only set via admin staff management)
    public string? PlainPassword { get; set; }

    // JSON array of screen keys — overrides role defaults when set by admin (e.g. ["tables","orders"])
    public string? CustomPermissions { get; set; }

    // Two-letter initials displayed in avatar circles
    public string Avatar { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Order> Orders { get; set; } = [];
}
