namespace RestoAPI.Models;

public class Order
{
    public int Id { get; set; }

    public int TableId { get; set; }
    public RestaurantTable Table { get; set; } = null!;

    public int ServerId { get; set; }
    public User Server { get; set; } = null!;

    // Statuses: active | ready | billing | paid | cancelled
    public string Status { get; set; } = "active";

    // Types: dine-in | takeaway | online
    public string OrderType { get; set; } = "dine-in";

    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<OrderItem> Items { get; set; } = [];
    public Payment? Payment { get; set; }
}
