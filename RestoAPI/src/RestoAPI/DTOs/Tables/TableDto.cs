namespace RestoAPI.DTOs.Tables;

public class ActiveOrderSummary
{
    public int Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public string OrderType { get; set; } = "dine-in";
    public decimal Subtotal { get; set; }
    public int ItemCount { get; set; }
    public int PendingItems { get; set; }
    public int PreparingItems { get; set; }
    public int ReadyItems { get; set; }
}

public class TableDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public int Seats { get; set; }
    public string Zone { get; set; } = "ground-floor";
    public string Status { get; set; } = string.Empty;
    public string? ServerName { get; set; }
    public int? ActiveOrderId { get; set; }

    // Formatted as "HH:mm" to match the frontend display (e.g. "12:30")
    public string? OccupiedSince { get; set; }

    // Status of the active order on this table (active|ready|billing), null when no active order
    public string? ActiveOrderStatus { get; set; }

    // All active orders on this table (supports multiple simultaneous orders / split billing)
    public List<ActiveOrderSummary> ActiveOrders { get; set; } = new();
}

public class UpdateTableStatusRequest
{
    public string Status { get; set; } = string.Empty;
    public int? ServerId { get; set; }
}

public class SeatGuestsRequest
{
    public int ServerId { get; set; }
    public int? GuestCount { get; set; }
}

public class CreateTableRequest
{
    public int Number { get; set; }
    public int Seats { get; set; }
    public string Zone { get; set; } = "ground-floor";
}
