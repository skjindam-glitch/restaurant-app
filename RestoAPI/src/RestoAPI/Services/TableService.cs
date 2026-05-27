using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Tables;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface ITableService
{
    Task<List<TableDto>> GetAllAsync(string? statusFilter);
    Task<TableDto?> GetByIdAsync(int id);
    Task<TableDto?> UpdateStatusAsync(int id, UpdateTableStatusRequest request);
    Task<TableDto?> SeatGuestsAsync(int id, SeatGuestsRequest request);
    Task<TableDto> CreateAsync(CreateTableRequest request);
    Task<bool> DeleteAsync(int id);
}

public class TableService(AppDbContext db) : ITableService
{
    public async Task<List<TableDto>> GetAllAsync(string? statusFilter)
    {
        var query = db.Tables
            .Include(t => t.Server)
            .Include(t => t.Orders.Where(o => o.Status == "active" || o.Status == "ready" || o.Status == "billing"))
                .ThenInclude(o => o.Items)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(statusFilter))
            query = query.Where(t => t.Status == statusFilter);

        var tables = await query.OrderBy(t => t.Number).ToListAsync();
        return tables.Select(Map).ToList();
    }

    public async Task<TableDto?> GetByIdAsync(int id)
    {
        var table = await db.Tables
            .Include(t => t.Server)
            .Include(t => t.Orders)
                .ThenInclude(o => o.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        return table is null ? null : Map(table);
    }

    public async Task<TableDto?> UpdateStatusAsync(int id, UpdateTableStatusRequest request)
    {
        var table = await db.Tables.FindAsync(id);
        if (table is null) return null;

        table.Status = request.Status;

        // Clear server assignment when table becomes available or dirty
        if (request.Status is "available" or "dirty")
        {
            table.ServerId      = null;
            table.OccupiedSince = null;
        }

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TableDto?> SeatGuestsAsync(int id, SeatGuestsRequest request)
    {
        var table = await db.Tables.FindAsync(id);
        if (table is null) return null;

        table.Status        = "occupied";
        table.ServerId      = request.ServerId;
        table.OccupiedSince = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<TableDto> CreateAsync(CreateTableRequest request)
    {
        var table = new RestaurantTable { Number = request.Number, Seats = request.Seats, Zone = request.Zone, Status = "available" };
        db.Tables.Add(table);
        await db.SaveChangesAsync();
        return await GetByIdAsync(table.Id) ?? Map(table);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var table = await db.Tables.FindAsync(id);
        if (table is null) return false;
        db.Tables.Remove(table);
        await db.SaveChangesAsync();
        return true;
    }

    private static TableDto Map(RestaurantTable t)
    {
        var allActive  = t.Orders.Where(o => o.Status is "active" or "ready" or "billing").ToList();
        var firstOrder = allActive.FirstOrDefault();
        return new TableDto
        {
            Id                = t.Id,
            Number            = t.Number,
            Seats             = t.Seats,
            Zone              = t.Zone,
            Status            = t.Status,
            ServerName        = t.Server?.Name,
            ActiveOrderId     = firstOrder?.Id,
            ActiveOrderStatus = firstOrder?.Status,
            OccupiedSince     = t.OccupiedSince?.ToLocalTime().ToString("HH:mm"),
            ActiveOrders      = allActive.Select(o => new ActiveOrderSummary
            {
                Id        = o.Id,
                Status    = o.Status,
                OrderType = o.OrderType,
                Subtotal  = o.Items.Sum(i => i.MenuItemPrice * i.Quantity),
                ItemCount = o.Items.Count,
            }).ToList(),
        };
    }
}
