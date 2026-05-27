namespace RestoAPI.Models;

public class Investment
{
    public int Id { get; set; }

    // Categories: ingredients, utilities, labor, maintenance, equipment, other
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;

    public int CreatedById { get; set; }
    public User CreatedBy { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
