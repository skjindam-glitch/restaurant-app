namespace RestoAPI.Models;

public class MenuItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }

    // Green dot = veg, red dot = non-veg (FSSAI food indicator)
    public bool IsVeg { get; set; }
    public bool IsPopular { get; set; }
    public bool IsAvailable { get; set; } = true;

    public string? Description { get; set; }
    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
