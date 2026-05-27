using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Kitchen;
using RestoAPI.Models;
using RestoAPI.Services;

namespace RestoAPI.Tests.Services;

public class KitchenServiceTests
{
    private static AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task UpdateItemStatus_EnforcesStateMachine_PendingToReady_Throws()
    {
        using var db = CreateDb();
        var table  = new RestaurantTable { Number = 1, Seats = 4, Status = "occupied" };
        var server = new User { Name = "X", Email = "x@t.com", PasswordHash = "h", Role = "server" };
        db.Tables.Add(table); db.Users.Add(server);
        await db.SaveChangesAsync();

        var order = new Order
        {
            TableId = table.Id, ServerId = server.Id, Status = "active",
            Items   = [new OrderItem { MenuItemName = "Dish", MenuItemPrice = 100m, Quantity = 1, KitchenStatus = "pending" }],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var svc = new KitchenService(db);
        var req = new UpdateKitchenItemStatusRequest { Status = "ready" }; // skip preparing

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.UpdateItemStatusAsync(order.Id, order.Items.First().Id, req));
    }

    [Fact]
    public async Task UpdateItemStatus_AllowsPendingToPreparing()
    {
        using var db = CreateDb();
        var table  = new RestaurantTable { Number = 2, Seats = 4, Status = "occupied" };
        var server = new User { Name = "Y", Email = "y@t.com", PasswordHash = "h", Role = "server" };
        db.Tables.Add(table); db.Users.Add(server);
        await db.SaveChangesAsync();

        var order = new Order
        {
            TableId = table.Id, ServerId = server.Id, Status = "active",
            Items   = [new OrderItem { MenuItemName = "Salad", MenuItemPrice = 80m, Quantity = 1, KitchenStatus = "pending" }],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var svc    = new KitchenService(db);
        var itemId = order.Items.First().Id;
        var result = await svc.UpdateItemStatusAsync(order.Id, itemId, new UpdateKitchenItemStatusRequest { Status = "preparing" });

        Assert.NotNull(result);
        Assert.Equal("preparing", result.Status);
    }

    [Fact]
    public async Task MarkAllServed_SetsOrderBillingAndTableBilling()
    {
        using var db = CreateDb();
        var table  = new RestaurantTable { Number = 3, Seats = 4, Status = "occupied" };
        var server = new User { Name = "Z", Email = "z@t.com", PasswordHash = "h", Role = "server" };
        db.Tables.Add(table); db.Users.Add(server);
        await db.SaveChangesAsync();

        var order = new Order
        {
            TableId = table.Id, ServerId = server.Id, Status = "ready",
            Items   = [new OrderItem { MenuItemName = "Soup", MenuItemPrice = 60m, Quantity = 1, KitchenStatus = "ready" }],
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();

        var svc    = new KitchenService(db);
        var result = await svc.MarkAllServedAsync(order.Id);

        Assert.NotNull(result);
        Assert.Equal("billing", result.Status);
        Assert.Equal("billing", (await db.Tables.FindAsync(table.Id))!.Status);
    }
}
