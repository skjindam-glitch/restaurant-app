using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Kitchen;
using RestoAPI.DTOs.Orders;

namespace RestoAPI.Services;

public interface IKitchenService
{
    Task<List<KdsOrderDto>> GetActiveOrdersAsync(string? statusFilter = null);
    Task<KdsItemDto?> UpdateItemStatusAsync(int orderId, int itemId, UpdateKitchenItemStatusRequest request);
    Task<OrderDto?> MarkAllServedAsync(int orderId);
}

public class KitchenService(AppDbContext db) : IKitchenService
{
    // Valid kitchen status transitions — prevents invalid state changes
    private static readonly Dictionary<string, string> AllowedTransitions = new()
    {
        ["pending"]   = "preparing",
        ["preparing"] = "ready",
    };

    public async Task<List<KdsOrderDto>> GetActiveOrdersAsync(string? statusFilter)
    {
        // Only show orders that are active or ready — exclude paid/cancelled
        var orders = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.Server)
            .Include(o => o.Items)
            .Where(o => o.Status == "active" && o.Items.Any(i => i.KitchenStatus != "served"))
            .OrderBy(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return orders
            .Select(o =>
            {
                var elapsed = (int)(DateTime.UtcNow - o.CreatedAt).TotalMinutes;
                var status  = GetOrderStatus(o.Items.Select(i => i.KitchenStatus).ToList());

                // Filter by kitchen status if requested
                if (!string.IsNullOrEmpty(statusFilter) && statusFilter != "all" && status != statusFilter)
                    return null;

                return new KdsOrderDto
                {
                    Id         = o.Id,
                    TableNumber = o.Table.Number,
                    ServerName  = o.Server.Name,
                    Elapsed     = $"{elapsed} min",
                    IsUrgent    = elapsed > 20,
                    OrderStatus = status,
                    Items       = o.Items.Select(i => new KdsItemDto
                    {
                        Id       = i.Id,
                        Name     = i.MenuItemName,
                        Quantity = i.Quantity,
                        Status   = i.KitchenStatus,
                        Notes    = i.Notes,
                    }).ToList(),
                };
            })
            .Where(o => o is not null)
            .ToList()!;
    }

    public async Task<KdsItemDto?> UpdateItemStatusAsync(int orderId, int itemId, UpdateKitchenItemStatusRequest request)
    {
        var item = await db.OrderItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.OrderId == orderId);

        if (item is null) return null;

        // Enforce valid transition — kitchen can't skip from pending directly to ready
        if (!AllowedTransitions.TryGetValue(item.KitchenStatus, out var allowed) || allowed != request.Status)
            throw new InvalidOperationException($"Cannot transition from '{item.KitchenStatus}' to '{request.Status}'.");

        item.KitchenStatus = request.Status;
        await db.SaveChangesAsync();

        return new KdsItemDto
        {
            Id       = item.Id,
            Name     = item.MenuItemName,
            Quantity = item.Quantity,
            Status   = item.KitchenStatus,
            Notes    = item.Notes,
        };
    }

    public async Task<OrderDto?> MarkAllServedAsync(int orderId)
    {
        var order = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.Server)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return null;

        foreach (var item in order.Items) item.KitchenStatus = "served";

        // Move order + table to "billing" once all items are served
        order.Status    = "billing";
        order.UpdatedAt = DateTime.UtcNow;

        var table = await db.Tables.FindAsync(order.TableId);
        if (table is not null) table.Status = "billing";

        await db.SaveChangesAsync();

        return new OrderDto
        {
            Id          = order.Id,
            TableNumber = order.Table.Number,
            ServerName  = order.Server.Name,
            Status      = order.Status,
            CreatedAt   = order.CreatedAt,
            Subtotal    = order.Items.Sum(i => i.MenuItemPrice * i.Quantity),
            Items       = order.Items.Select(i => new RestoAPI.DTOs.Orders.OrderItemDto
            {
                Id            = i.Id,
                MenuItemId    = i.MenuItemId,
                Name          = i.MenuItemName,
                Price         = i.MenuItemPrice,
                Quantity      = i.Quantity,
                KitchenStatus = i.KitchenStatus,
                Notes         = i.Notes,
            }).ToList(),
        };
    }

    // Derives an aggregate order status from its individual item statuses
    private static string GetOrderStatus(List<string> statuses)
    {
        if (statuses.All(s => s == "ready" || s == "served")) return "ready";
        if (statuses.Any(s => s == "preparing"))              return "preparing";
        return "pending";
    }
}
