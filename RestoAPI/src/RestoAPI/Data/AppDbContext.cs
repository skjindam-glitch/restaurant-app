using Microsoft.EntityFrameworkCore;
using RestoAPI.Models;

namespace RestoAPI.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RestaurantTable> Tables => Set<RestaurantTable>();
    public DbSet<MenuItem> MenuItems => Set<MenuItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Investment> Investments => Set<Investment>();
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        // Unique constraints
        model.Entity<User>().HasIndex(u => u.Email).IsUnique();
        model.Entity<RestaurantTable>().HasIndex(t => new { t.Number, t.Zone }).IsUnique();

        // Decimal precision for all money columns
        model.Entity<MenuItem>().Property(m => m.Price).HasPrecision(10, 2);
        model.Entity<OrderItem>().Property(o => o.MenuItemPrice).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.Subtotal).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.TaxAmount).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.ServiceCharge).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.DiscountPercent).HasPrecision(5, 2);
        model.Entity<Payment>().Property(p => p.DiscountAmount).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.TotalAmount).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.CashReceived).HasPrecision(10, 2);
        model.Entity<Payment>().Property(p => p.ChangeGiven).HasPrecision(10, 2);

        // Prevent cascade delete loops — set server FK to null when user is deleted
        model.Entity<RestaurantTable>()
            .HasOne(t => t.Server)
            .WithMany()
            .HasForeignKey(t => t.ServerId)
            .OnDelete(DeleteBehavior.SetNull);

        model.Entity<Payment>()
            .HasOne(p => p.ProcessedBy)
            .WithMany()
            .HasForeignKey(p => p.ProcessedById)
            .OnDelete(DeleteBehavior.Restrict);

        // One order has one payment
        model.Entity<Order>()
            .HasOne(o => o.Payment)
            .WithOne(p => p.Order)
            .HasForeignKey<Payment>(p => p.OrderId);

        model.Entity<Investment>().Property(i => i.Amount).HasPrecision(10, 2);
        model.Entity<Investment>()
            .HasOne(i => i.CreatedBy)
            .WithMany()
            .HasForeignKey(i => i.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        model.Entity<Notification>()
            .HasOne(n => n.CreatedBy)
            .WithMany()
            .HasForeignKey(n => n.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
