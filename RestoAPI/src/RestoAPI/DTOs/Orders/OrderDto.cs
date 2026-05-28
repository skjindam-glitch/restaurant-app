using System.ComponentModel.DataAnnotations;

namespace RestoAPI.DTOs.Orders;

public class OrderDto
{
    public int Id { get; set; }
    public int TableNumber { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string OrderType { get; set; } = "dine-in";
    public List<OrderItemDto> Items { get; set; } = [];
    public decimal Subtotal { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class OrderItemDto
{
    public int Id { get; set; }
    public int MenuItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public string KitchenStatus { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class CreateOrderRequest
{
    [Required]
    public int TableId { get; set; }

    [Required]
    public List<OrderItemRequest> Items { get; set; } = [];

    public string OrderType { get; set; } = "dine-in";
}

public class OrderItemRequest
{
    [Required]
    public int MenuItemId { get; set; }

    [Required, Range(1, 99)]
    public int Quantity { get; set; }

    public string? Notes { get; set; }
}

public class UpdateOrderItemsRequest
{
    public List<OrderItemRequest> Items { get; set; } = [];
}

public class AddOrderItemsRequest
{
    public List<OrderItemRequest> Items { get; set; } = [];
}
