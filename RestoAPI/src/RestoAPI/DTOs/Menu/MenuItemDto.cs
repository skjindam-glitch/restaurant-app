using System.ComponentModel.DataAnnotations;

namespace RestoAPI.DTOs.Menu;

public class MenuItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsVeg { get; set; }
    public bool IsPopular { get; set; }
    public bool IsAvailable { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
}

public class CreateMenuItemRequest
{
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    [Required, Range(0.01, 100000)]
    public decimal Price { get; set; }

    public bool IsVeg { get; set; }
    public bool IsPopular { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
}

public class UpdateMenuItemRequest : CreateMenuItemRequest
{
    public bool IsAvailable { get; set; } = true;
}
