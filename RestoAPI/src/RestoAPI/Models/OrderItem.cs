namespace RestoAPI.Models;

public class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    public int MenuItemId { get; set; }
    public MenuItem MenuItem { get; set; } = null!;

    // Snapshot the name and price at order time — menu prices can change later
    public string MenuItemName { get; set; } = string.Empty;
    public decimal MenuItemPrice { get; set; }

    public int Quantity { get; set; }

    // Kitchen display status: pending | preparing | ready | served
    public string KitchenStatus { get; set; } = "pending";

    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
