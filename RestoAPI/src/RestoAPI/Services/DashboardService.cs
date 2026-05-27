using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Dashboard;

namespace RestoAPI.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync();
    Task<TableStatusSummaryDto> GetTableStatusAsync();
    Task<List<TopMenuItemDto>> GetTopItemsAsync(int limit = 5);
    Task<List<TopStaffDto>> GetTopStaffAsync(int limit = 5);
    Task<OrderTypeBreakdownDto> GetOrderTypeBreakdownAsync(string period = "today");
}

public class DashboardService(AppDbContext db) : IDashboardService
{
    public async Task<DashboardSummaryDto> GetSummaryAsync()
    {
        var today       = DateTime.UtcNow.Date;
        var yesterday   = today.AddDays(-1);

        // Today's revenue from completed payments
        var todayRevenue    = await db.Payments.Where(p => p.ProcessedAt >= today).SumAsync(p => (decimal?)p.TotalAmount) ?? 0;
        var yesterdayRevenue = await db.Payments.Where(p => p.ProcessedAt >= yesterday && p.ProcessedAt < today).SumAsync(p => (decimal?)p.TotalAmount) ?? 0;

        var todayOrders    = await db.Orders.CountAsync(o => o.CreatedAt >= today);
        var yesterdayOrders = await db.Orders.CountAsync(o => o.CreatedAt >= yesterday && o.CreatedAt < today);

        var activeTables  = await db.Tables.CountAsync(t => t.Status == "occupied" || t.Status == "billing");
        var totalTables   = await db.Tables.CountAsync();

        // Average order fulfilment time — TotalMinutes isn't SQL-translatable, evaluate on client
        var paidTimes = await db.Orders
            .Where(o => o.Status == "paid" && o.CreatedAt >= today)
            .Select(o => new { o.CreatedAt, o.UpdatedAt })
            .ToListAsync();

        var avgMinutes = paidTimes.Count > 0
            ? paidTimes.Average(o => (o.UpdatedAt - o.CreatedAt).TotalMinutes)
            : 0;

        return new DashboardSummaryDto
        {
            Revenue = new KpiDto
            {
                Value  = $"₹{todayRevenue:N0}",
                Change = FormatChange(todayRevenue, yesterdayRevenue, "%"),
                IsUp   = todayRevenue >= yesterdayRevenue,
            },
            TotalOrders = new KpiDto
            {
                Value  = todayOrders.ToString(),
                Change = FormatChange(todayOrders, yesterdayOrders, "%"),
                IsUp   = todayOrders >= yesterdayOrders,
            },
            ActiveTables = new KpiDto
            {
                Value  = $"{activeTables} / {totalTables}",
                Change = $"{(totalTables > 0 ? activeTables * 100 / totalTables : 0)}%",
                IsUp   = true,
            },
            AvgOrderTime = new KpiDto
            {
                Value  = $"{(int)avgMinutes} min",
                Change = $"{(int)avgMinutes} min",
                IsUp   = avgMinutes <= 30, // Under 30 min is good
            },
        };
    }

    public async Task<TableStatusSummaryDto> GetTableStatusAsync()
    {
        var counts = await db.Tables
            .GroupBy(t => t.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync();

        return new TableStatusSummaryDto
        {
            Available = counts.FirstOrDefault(c => c.Status == "available")?.Count ?? 0,
            Occupied  = counts.FirstOrDefault(c => c.Status == "occupied")?.Count ?? 0,
            Reserved  = counts.FirstOrDefault(c => c.Status == "reserved")?.Count ?? 0,
            Billing   = counts.FirstOrDefault(c => c.Status == "billing")?.Count ?? 0,
            Dirty     = counts.FirstOrDefault(c => c.Status == "dirty")?.Count ?? 0,
            Total     = counts.Sum(c => c.Count),
        };
    }

    public async Task<List<TopMenuItemDto>> GetTopItemsAsync(int limit = 5)
    {
        // Aggregate from OrderItems — gives real sales data across all time
        return await db.OrderItems
            .GroupBy(i => i.MenuItemName)
            .Select(g => new TopMenuItemDto
            {
                Name       = g.Key,
                OrderCount = g.Sum(i => i.Quantity),
                Revenue    = g.Sum(i => i.MenuItemPrice * i.Quantity),
            })
            .OrderByDescending(i => i.OrderCount)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<TopStaffDto>> GetTopStaffAsync(int limit = 5)
    {
        return await db.Orders
            .Where(o => o.Status == "paid")
            .Include(o => o.Server)
            .Include(o => o.Payment)
            .GroupBy(o => new { o.ServerId, o.Server.Name, o.Server.Role, o.Server.Avatar })
            .Select(g => new TopStaffDto
            {
                Name       = g.Key.Name,
                Role       = g.Key.Role,
                Avatar     = g.Key.Avatar,
                OrderCount = g.Count(),
                TotalSales = g.Sum(o => o.Payment != null ? o.Payment.TotalAmount : 0),
            })
            .OrderByDescending(s => s.TotalSales)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<OrderTypeBreakdownDto> GetOrderTypeBreakdownAsync(string period = "today")
    {
        var today = DateTime.UtcNow.Date;

        var baseQuery = db.Payments
            .Join(db.Orders, p => p.OrderId, o => o.Id,
                  (p, o) => new { p.TotalAmount, o.OrderType, p.ProcessedAt });

        var filtered = period switch
        {
            "week"  => baseQuery.Where(x => x.ProcessedAt >= today.AddDays(-7)),
            "month" => baseQuery.Where(x => x.ProcessedAt >= today.AddDays(-30)),
            "all"   => baseQuery,
            _       => baseQuery.Where(x => x.ProcessedAt >= today),
        };

        var rows = await filtered
            .GroupBy(x => x.OrderType)
            .Select(g => new { Type = g.Key, Amount = g.Sum(x => x.TotalAmount), Count = g.Count() })
            .ToListAsync();

        decimal Amt(string t)  => rows.FirstOrDefault(r => r.Type == t)?.Amount ?? 0;
        int     Cnt(string t)  => rows.FirstOrDefault(r => r.Type == t)?.Count  ?? 0;

        return new OrderTypeBreakdownDto
        {
            DineIn        = Amt("dine-in"),
            DineInCount   = Cnt("dine-in"),
            Takeaway      = Amt("takeaway"),
            TakeawayCount = Cnt("takeaway"),
            Online        = Amt("online"),
            OnlineCount   = Cnt("online"),
        };
    }

    // Formats a percentage change between two values, e.g. "+12.4%"
    private static string FormatChange(decimal current, decimal previous, string suffix)
    {
        if (previous == 0) return "N/A";
        var pct = Math.Round((current - previous) / previous * 100, 1);
        return pct >= 0 ? $"+{pct}{suffix}" : $"{pct}{suffix}";
    }

    private static string FormatChange(int current, int previous, string suffix) =>
        FormatChange((decimal)current, previous, suffix);
}
