namespace RestoAPI.DTOs.Kitchen;

public class KdsOrderDto
{
    public int Id { get; set; }
    public int TableNumber { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string Elapsed { get; set; } = string.Empty;  // e.g. "18 min"
    public bool IsUrgent { get; set; }                   // true when elapsed > 20 min
    public string OrderStatus { get; set; } = string.Empty;
    public List<KdsItemDto> Items { get; set; } = [];
}

public class KdsItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class UpdateKitchenItemStatusRequest
{
    // Allowed transitions: pending→preparing, preparing→ready
    public string Status { get; set; } = string.Empty;
}
