using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Orders;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface IOrderService
{
    Task<List<OrderDto>> GetAllAsync(string? status, int? tableId);
    Task<OrderDto?> GetByIdAsync(int id);
    Task<OrderDto> CreateAsync(int serverId, CreateOrderRequest request);
    Task<OrderDto?> UpdateItemsAsync(int id, UpdateOrderItemsRequest request);
    Task<OrderDto?> SendToKitchenAsync(int id);
    Task<OrderDto?> UpdateStatusAsync(int id, string status);
}

public class OrderService(AppDbContext db) : IOrderService
{
    public async Task<List<OrderDto>> GetAllAsync(string? status, int? tableId)
    {
        var query = db.Orders
            .Include(o => o.Table)
            .Include(o => o.Server)
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(status)) query = query.Where(o => o.Status == status);
        if (tableId.HasValue)              query = query.Where(o => o.TableId == tableId);

        var orders = await query.OrderByDescending(o => o.CreatedAt).ToListAsync();
        return orders.Select(Map).ToList();
    }

    public async Task<OrderDto?> GetByIdAsync(int id)
    {
        var order = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.Server)
            .Include(o => o.Items).ThenInclude(i => i.MenuItem)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        return order is null ? null : Map(order);
    }

    public async Task<OrderDto> CreateAsync(int serverId, CreateOrderRequest request)
    {
        // Snapshot menu item names + prices so historical bills remain accurate
        // even if menu prices change later
        var menuItemIds = request.Items.Select(i => i.MenuItemId).ToList();
        var menuItems   = await db.MenuItems
            .Where(m => menuItemIds.Contains(m.Id))
            .ToDictionaryAsync(m => m.Id);

        var order = new Order
        {
            TableId   = request.TableId,
            ServerId  = serverId,
            Status    = "active",
            OrderType = request.OrderType,
            Items     = request.Items.Select(i => new OrderItem
            {
                MenuItemId    = i.MenuItemId,
                MenuItemName  = menuItems[i.MenuItemId].Name,
                MenuItemPrice = menuItems[i.MenuItemId].Price,
                Quantity      = i.Quantity,
                KitchenStatus = "pending",
                Notes         = i.Notes,
            }).ToList(),
        };

        db.Orders.Add(order);

        // Mark table as occupied
        var table = await db.Tables.FindAsync(request.TableId);
        if (table is not null)
        {
            table.Status   = "occupied";
            table.ServerId = serverId;
        }

        await db.SaveChangesAsync();
        return (await GetByIdAsync(order.Id))!;
    }

    public async Task<OrderDto?> UpdateItemsAsync(int id, UpdateOrderItemsRequest request)
    {
        var order = await db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        var menuItemIds = request.Items.Select(i => i.MenuItemId).ToList();
        var menuItems   = await db.MenuItems.Where(m => menuItemIds.Contains(m.Id)).ToDictionaryAsync(m => m.Id);

        // Replace all items — client sends the full desired list
        db.OrderItems.RemoveRange(order.Items);
        order.Items = request.Items.Select(i => new OrderItem
        {
            MenuItemId    = i.MenuItemId,
            MenuItemName  = menuItems[i.MenuItemId].Name,
            MenuItemPrice = menuItems[i.MenuItemId].Price,
            Quantity      = i.Quantity,
            KitchenStatus = "pending",
            Notes         = i.Notes,
        }).ToList();

        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<OrderDto?> SendToKitchenAsync(int id)
    {
        // Sending to kitchen just means items are now visible on KDS (already pending)
        var order = await db.Orders.FindAsync(id);
        if (order is null) return null;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<OrderDto?> UpdateStatusAsync(int id, string status)
    {
        var order = await db.Orders.FindAsync(id);
        if (order is null) return null;
        order.Status    = status;
        order.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    private static OrderDto Map(Order o) => new()
    {
        Id          = o.Id,
        TableNumber = o.Table.Number,
        ServerName  = o.Server.Name,
        Status      = o.Status,
        OrderType   = o.OrderType,
        CreatedAt   = o.CreatedAt,
        Subtotal    = o.Items.Sum(i => i.MenuItemPrice * i.Quantity),
        Items       = o.Items.Select(i => new OrderItemDto
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
