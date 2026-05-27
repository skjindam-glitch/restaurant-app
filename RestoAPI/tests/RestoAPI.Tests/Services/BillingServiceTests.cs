using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Billing;
using RestoAPI.Models;
using RestoAPI.Services;

namespace RestoAPI.Tests.Services;

public class BillingServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetBill_ReturnsNull_WhenOrderNotFound()
    {
        using var db = CreateDb();
        var svc = new BillingService(db);

        var result = await svc.GetBillAsync(999);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetBill_ReturnsBillDto_WithCorrectTotals()
    {
        using var db = CreateDb();
        var table = new RestaurantTable { Number = 1, Seats = 4, Status = "billing" };
        db.Tables.Add(table);
        var server = new User { Name = "Alice", Email = "a@test.com", PasswordHash = "x", Role = "server" };
        db.Users.Add(server);
        await db.SaveChangesAsync();

        var order = new Order
        {
            TableId  = table.Id,
            ServerId = server.Id,
            Status   = "billing",
            Items    =
            [
                new OrderItem { MenuItemName = "Burger", MenuItemPrice = 200m, Quantity = 2, KitchenStatus = "served" },
                new OrderItem { MenuItemName = "Coke",   MenuItemPrice =  50m, Quantity = 1, KitchenStatus = "served" },
            ],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var svc    = new BillingService(db);
        var result = await svc.GetBillAsync(order.Id);

        Assert.NotNull(result);
        // Subtotal = 2×200 + 1×50 = 450
        Assert.Equal(450m, result.Subtotal);
        // Tax = 5% = 22.5, Service = 5% = 22.5, Total = 495
        Assert.Equal(22.5m,  result.Tax);
        Assert.Equal(22.5m,  result.ServiceCharge);
        Assert.Equal(495m,   result.Total);
    }

    [Fact]
    public async Task ProcessPayment_ReturnsNull_WhenOrderNotFound()
    {
        using var db = CreateDb();
        var svc = new BillingService(db);

        var result = await svc.ProcessPaymentAsync(999, 1, new ProcessPaymentRequest { Method = "cash", CashReceived = 500 });

        Assert.Null(result);
    }

    [Fact]
    public async Task ProcessPayment_ThrowsArgumentException_WhenCashInsufficient()
    {
        using var db = CreateDb();
        var table = new RestaurantTable { Number = 2, Seats = 2, Status = "billing" };
        db.Tables.Add(table);
        var server = new User { Name = "Bob", Email = "b@test.com", PasswordHash = "x", Role = "server" };
        var cashier = new User { Name = "Cash", Email = "c@test.com", PasswordHash = "x", Role = "cashier" };
        db.Users.AddRange(server, cashier);
        await db.SaveChangesAsync();

        var order = new Order
        {
            TableId  = table.Id,
            ServerId = server.Id,
            Status   = "billing",
            Items    = [new OrderItem { MenuItemName = "Steak", MenuItemPrice = 500m, Quantity = 1, KitchenStatus = "served" }],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var svc = new BillingService(db);
        var req = new ProcessPaymentRequest { Method = "cash", CashReceived = 100 }; // way too little

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.ProcessPaymentAsync(order.Id, cashier.Id, req));
    }

    [Fact]
    public async Task ProcessPayment_SetsOrderPaidAndTableDirty()
    {
        using var db = CreateDb();
        var table = new RestaurantTable { Number = 3, Seats = 4, Status = "billing" };
        db.Tables.Add(table);
        var server  = new User { Name = "S", Email = "s@test.com", PasswordHash = "x", Role = "server" };
        var cashier = new User { Name = "C", Email = "cc@test.com", PasswordHash = "x", Role = "cashier" };
        db.Users.AddRange(server, cashier);
        await db.SaveChangesAsync();

        var order = new Order
        {
            TableId  = table.Id,
            ServerId = server.Id,
            Status   = "billing",
            Items    = [new OrderItem { MenuItemName = "Pizza", MenuItemPrice = 300m, Quantity = 1, KitchenStatus = "served" }],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var svc    = new BillingService(db);
        var req    = new ProcessPaymentRequest { Method = "cash", CashReceived = 400 };
        var result = await svc.ProcessPaymentAsync(order.Id, cashier.Id, req);

        Assert.NotNull(result);
        Assert.Equal("paid", (await db.Orders.FindAsync(order.Id))!.Status);
        Assert.Equal("dirty", (await db.Tables.FindAsync(table.Id))!.Status);
    }
}
