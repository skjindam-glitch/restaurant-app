using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Billing;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface IBillingService
{
    Task<List<BillDto>> GetPendingBillsAsync();
    Task<BillDto?> GetBillAsync(int orderId);
    Task<PaymentResultDto?> ProcessPaymentAsync(int orderId, int cashierId, ProcessPaymentRequest request);
    Task<List<PaymentHistoryDto>> GetHistoryAsync(int limit);
    Task<SplitBillResultDto?> GetSplitBillAsync(int orderId, SplitBillRequest request);
}

public class BillingService(AppDbContext db) : IBillingService
{
    // GST split: 5% tax + 5% service charge on subtotal
    private const decimal TaxRate     = 0.05m;
    private const decimal ServiceRate = 0.05m;

    public async Task<List<BillDto>> GetPendingBillsAsync()
    {
        var orders = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.Server)
            .Include(o => o.Items)
            .Where(o => o.Status == "billing")
            .OrderBy(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return orders.Select(MapBill).ToList();
    }

    public async Task<BillDto?> GetBillAsync(int orderId)
    {
        var order = await db.Orders
            .Include(o => o.Table)
            .Include(o => o.Server)
            .Include(o => o.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == orderId);

        return order is null ? null : MapBill(order);
    }

    public async Task<PaymentResultDto?> ProcessPaymentAsync(int orderId, int cashierId, ProcessPaymentRequest request)
    {
        var order = await db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return null;

        var subtotal       = order.Items.Sum(i => i.MenuItemPrice * i.Quantity);
        var tax            = Math.Round(subtotal * TaxRate, 2);
        var service        = Math.Round(subtotal * ServiceRate, 2);
        var discountAmount = Math.Round(subtotal * (request.DiscountPercent / 100), 2);
        var total          = subtotal + tax + service - discountAmount;

        // Validate cash payment — cashier must receive at least the total amount
        if (request.Method == "cash" && (request.CashReceived ?? 0) < total)
            throw new InvalidOperationException("Cash received is less than total amount.");

        var changeGiven = request.Method == "cash"
            ? Math.Round((request.CashReceived ?? 0) - total, 2)
            : (decimal?)null;

        var payment = new Payment
        {
            OrderId        = orderId,
            Method         = request.Method,
            Subtotal       = subtotal,
            TaxAmount      = tax,
            ServiceCharge  = service,
            DiscountPercent = request.DiscountPercent,
            DiscountAmount = discountAmount,
            TotalAmount    = total,
            CashReceived   = request.CashReceived,
            ChangeGiven    = changeGiven,
            ProcessedById  = cashierId,
        };
        db.Payments.Add(payment);

        // Mark order as paid
        order.Status    = "paid";
        order.UpdatedAt = DateTime.UtcNow;

        // Only free the table when every order on it is settled — multiple customers may share a table
        var hasRemainingOrders = await db.Orders
            .AnyAsync(o => o.TableId == order.TableId && o.Id != orderId &&
                           o.Status != "paid" && o.Status != "cancelled");

        var table = await db.Tables.FindAsync(order.TableId);
        if (table is not null && !hasRemainingOrders)
        {
            table.Status        = "dirty";
            table.ServerId      = null;
            table.OccupiedSince = null;
        }

        await db.SaveChangesAsync();

        return new PaymentResultDto
        {
            PaymentId    = payment.Id,
            TotalCharged = total,
            ChangeGiven  = changeGiven,
            Method       = request.Method,
        };
    }

    public async Task<List<PaymentHistoryDto>> GetHistoryAsync(int limit)
    {
        var payments = await db.Payments
            .Include(p => p.Order).ThenInclude(o => o.Table)
            .Include(p => p.Order).ThenInclude(o => o.Server)
            .Include(p => p.Order).ThenInclude(o => o.Items)
            .OrderByDescending(p => p.ProcessedAt)
            .Take(limit)
            .AsNoTracking()
            .ToListAsync();

        return payments.Select(p => new PaymentHistoryDto
        {
            PaymentId      = p.Id,
            OrderId        = p.OrderId,
            TableNumber    = p.Order.Table.Number,
            ServerName     = p.Order.Server.Name,
            OrderType      = p.Order.OrderType,
            Method         = p.Method,
            Subtotal       = p.Subtotal,
            TaxAmount      = p.TaxAmount,
            ServiceCharge  = p.ServiceCharge,
            DiscountAmount = p.DiscountAmount,
            TotalAmount    = p.TotalAmount,
            ProcessedAt    = p.ProcessedAt,
            Items          = p.Order.Items.Select(i => new BillItemDto
            {
                Name      = i.MenuItemName,
                Quantity  = i.Quantity,
                Price     = i.MenuItemPrice,
                LineTotal = i.MenuItemPrice * i.Quantity,
            }).ToList(),
        }).ToList();
    }

    public async Task<SplitBillResultDto?> GetSplitBillAsync(int orderId, SplitBillRequest request)
    {
        var order = await db.Orders.Include(o => o.Items).AsNoTracking().FirstOrDefaultAsync(o => o.Id == orderId);
        if (order is null) return null;

        var subtotal       = order.Items.Sum(i => i.MenuItemPrice * i.Quantity);
        var tax            = Math.Round(subtotal * TaxRate, 2);
        var service        = Math.Round(subtotal * ServiceRate, 2);
        var discountAmount = Math.Round(subtotal * (request.DiscountPercent / 100), 2);
        var total          = subtotal + tax + service - discountAmount;

        var splitCount     = Math.Max(2, request.SplitCount);
        var baseAmount     = Math.Round(total / splitCount, 2);
        var remainder      = total - (baseAmount * (splitCount - 1));

        var splits = Enumerable.Range(1, splitCount).Select(n => new SplitPersonDto
        {
            PersonNumber = n,
            Amount       = n == splitCount ? remainder : baseAmount,
        }).ToList();

        return new SplitBillResultDto
        {
            SplitCount      = splitCount,
            TotalAmount     = total,
            AmountPerPerson = baseAmount,
            Splits          = splits,
        };
    }

    private static BillDto MapBill(Order o)
    {
        var subtotal = o.Items.Sum(i => i.MenuItemPrice * i.Quantity);
        var tax      = Math.Round(subtotal * TaxRate, 2);
        var service  = Math.Round(subtotal * ServiceRate, 2);

        return new BillDto
        {
            OrderId     = o.Id,
            TableNumber = o.Table.Number,
            ServerName  = o.Server.Name,
            OrderTime   = o.CreatedAt.ToLocalTime().ToString("HH:mm"),
            Subtotal    = subtotal,
            Tax         = tax,
            ServiceCharge = service,
            Total       = subtotal + tax + service,
            Items       = o.Items.Select(i => new BillItemDto
            {
                Name      = i.MenuItemName,
                Quantity  = i.Quantity,
                Price     = i.MenuItemPrice,
                LineTotal = i.MenuItemPrice * i.Quantity,
            }).ToList(),
        };
    }
}
