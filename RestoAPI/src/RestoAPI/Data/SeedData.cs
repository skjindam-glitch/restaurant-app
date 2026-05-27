using RestoAPI.Models;

namespace RestoAPI.Data;

public static class SeedData
{
    public static async Task SeedAsync(AppDbContext db)
    {
        // Seed base users + tables + menu if DB is empty
        if (!db.Users.Any())
        {
            var users = new List<User>
            {
                new() { Name = "Restaurant Owner", Email = "admin@resto.com",   PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), PlainPassword = "password123", Role = "admin",   Avatar = "RO" },
                new() { Name = "Vikram Singh",     Email = "manager@resto.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), PlainPassword = "password123", Role = "manager", Avatar = "VS" },
                new() { Name = "Arjun Sharma",     Email = "server@resto.com",  PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), PlainPassword = "password123", Role = "server",  Avatar = "AS" },
                new() { Name = "Ravi Kumar",       Email = "cashier@resto.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), PlainPassword = "password123", Role = "cashier", Avatar = "RK" },
                new() { Name = "Sunita Patel",     Email = "kitchen@resto.com", PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"), PlainPassword = "password123", Role = "kitchen", Avatar = "SP" },
            };
            db.Users.AddRange(users);
            await db.SaveChangesAsync();

            var tables = Enumerable.Range(1, 10).Select(n => new RestaurantTable
            {
                Number = n,
                Seats  = n % 3 == 0 ? 6 : n % 2 == 0 ? 4 : 2,
                Status = "available"
            }).ToList();
            db.Tables.AddRange(tables);

            var menuItems = new List<MenuItem>
            {
                new() { Name = "Paneer Tikka",    Category = "Starters",  Price = 320, IsVeg = true,  IsPopular = true,  Description = "Grilled cottage cheese with spices" },
                new() { Name = "Chicken 65",      Category = "Starters",  Price = 380, IsVeg = false, IsPopular = true,  Description = "Crispy spiced fried chicken" },
                new() { Name = "Veg Manchurian",  Category = "Starters",  Price = 280, IsVeg = true,                     Description = "Vegetable dumplings in manchurian sauce" },
                new() { Name = "Chilli Chicken",  Category = "Starters",  Price = 360, IsVeg = false,                    Description = "Spicy indo-chinese chicken" },
                new() { Name = "Butter Chicken",  Category = "Mains",     Price = 420, IsVeg = false, IsPopular = true,  Description = "Creamy tomato-based chicken curry" },
                new() { Name = "Dal Makhani",     Category = "Mains",     Price = 320, IsVeg = true,                     Description = "Slow-cooked black lentils" },
                new() { Name = "Palak Paneer",    Category = "Mains",     Price = 340, IsVeg = true,                     Description = "Cottage cheese in spinach gravy" },
                new() { Name = "Chicken Biryani", Category = "Biryani",   Price = 380, IsVeg = false, IsPopular = true,  Description = "Aromatic basmati rice with chicken" },
                new() { Name = "Veg Biryani",     Category = "Biryani",   Price = 300, IsVeg = true,                     Description = "Fragrant rice with mixed vegetables" },
                new() { Name = "Butter Naan",     Category = "Breads",    Price = 60,  IsVeg = true,  IsPopular = true,  Description = "Soft leavened bread with butter" },
                new() { Name = "Garlic Naan",     Category = "Breads",    Price = 70,  IsVeg = true,                     Description = "Naan topped with garlic and herbs" },
                new() { Name = "Mango Lassi",     Category = "Beverages", Price = 120, IsVeg = true,  IsPopular = true,  Description = "Sweet mango yogurt drink" },
                new() { Name = "Masala Chai",     Category = "Beverages", Price = 80,  IsVeg = true,                     Description = "Spiced milk tea" },
                new() { Name = "Gulab Jamun",     Category = "Desserts",  Price = 140, IsVeg = true,  IsPopular = true,  Description = "Soft milk-solid dumplings in syrup" },
                new() { Name = "Kulfi Falooda",   Category = "Desserts",  Price = 180, IsVeg = true,                     Description = "Indian ice cream with vermicelli" },
            };
            db.MenuItems.AddRange(menuItems);
            await db.SaveChangesAsync();
        }
        else
        {
            // Ensure admin user exists even on upgraded databases
            if (!db.Users.Any(u => u.Role == "admin"))
            {
                db.Users.Add(new User
                {
                    Name = "Restaurant Owner", Email = "admin@resto.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                    PlainPassword = "password123", Role = "admin", Avatar = "RO"
                });
                await db.SaveChangesAsync();
            }

            // Backfill plain passwords for the original seed accounts (password was password123)
            var seedEmails = new[] { "manager@resto.com", "server@resto.com", "cashier@resto.com", "kitchen@resto.com" };
            var needsBackfill = db.Users.Where(u => seedEmails.Contains(u.Email) && u.PlainPassword == null).ToList();
            if (needsBackfill.Any())
            {
                foreach (var u in needsBackfill) u.PlainPassword = "password123";
                await db.SaveChangesAsync();
            }
        }

        // Seed sample orders + payments if none exist (so reports show real numbers)
        if (!db.Orders.Any())
        {
            var server  = db.Users.First(u => u.Role == "server");
            var cashier = db.Users.First(u => u.Role == "cashier");
            var tables  = db.Tables.OrderBy(t => t.Number).ToList();
            var items   = db.MenuItems.ToList();

            var today     = DateTime.UtcNow.Date;
            var yesterday = today.AddDays(-1);

            // Helper to find menu item
            MenuItem Item(string name) => items.First(i => i.Name == name);

            // --- Yesterday: 3 fully paid orders ---
            var o1 = new Order
            {
                TableId = tables[0].Id, ServerId = server.Id, Status = "paid",
                CreatedAt = yesterday.AddHours(12), UpdatedAt = yesterday.AddHours(13),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Butter Chicken").Id, MenuItemName = "Butter Chicken", MenuItemPrice = 420, Quantity = 2, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Butter Naan").Id,    MenuItemName = "Butter Naan",    MenuItemPrice = 60,  Quantity = 4, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Mango Lassi").Id,    MenuItemName = "Mango Lassi",    MenuItemPrice = 120, Quantity = 2, KitchenStatus = "ready" },
                }
            };
            var o2 = new Order
            {
                TableId = tables[1].Id, ServerId = server.Id, Status = "paid",
                CreatedAt = yesterday.AddHours(14), UpdatedAt = yesterday.AddHours(15),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Chicken Biryani").Id, MenuItemName = "Chicken Biryani", MenuItemPrice = 380, Quantity = 2, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Paneer Tikka").Id,    MenuItemName = "Paneer Tikka",    MenuItemPrice = 320, Quantity = 1, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Masala Chai").Id,     MenuItemName = "Masala Chai",     MenuItemPrice = 80,  Quantity = 2, KitchenStatus = "ready" },
                }
            };
            var o3 = new Order
            {
                TableId = tables[2].Id, ServerId = server.Id, Status = "paid",
                CreatedAt = yesterday.AddHours(19), UpdatedAt = yesterday.AddHours(20),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Chicken 65").Id,     MenuItemName = "Chicken 65",     MenuItemPrice = 380, Quantity = 2, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Dal Makhani").Id,    MenuItemName = "Dal Makhani",    MenuItemPrice = 320, Quantity = 1, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Garlic Naan").Id,    MenuItemName = "Garlic Naan",    MenuItemPrice = 70,  Quantity = 3, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Gulab Jamun").Id,    MenuItemName = "Gulab Jamun",    MenuItemPrice = 140, Quantity = 2, KitchenStatus = "ready" },
                }
            };

            // --- Today: 3 fully paid + 2 active ---
            var o4 = new Order
            {
                TableId = tables[3].Id, ServerId = server.Id, Status = "paid",
                CreatedAt = today.AddHours(12), UpdatedAt = today.AddHours(13),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Palak Paneer").Id,   MenuItemName = "Palak Paneer",   MenuItemPrice = 340, Quantity = 2, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Butter Naan").Id,    MenuItemName = "Butter Naan",    MenuItemPrice = 60,  Quantity = 4, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Mango Lassi").Id,    MenuItemName = "Mango Lassi",    MenuItemPrice = 120, Quantity = 2, KitchenStatus = "ready" },
                }
            };
            var o5 = new Order
            {
                TableId = tables[4].Id, ServerId = server.Id, Status = "paid",
                CreatedAt = today.AddHours(13.5), UpdatedAt = today.AddHours(14.5),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Butter Chicken").Id,  MenuItemName = "Butter Chicken",  MenuItemPrice = 420, Quantity = 1, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Chicken Biryani").Id, MenuItemName = "Chicken Biryani", MenuItemPrice = 380, Quantity = 2, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Veg Biryani").Id,     MenuItemName = "Veg Biryani",     MenuItemPrice = 300, Quantity = 1, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Gulab Jamun").Id,     MenuItemName = "Gulab Jamun",     MenuItemPrice = 140, Quantity = 3, KitchenStatus = "ready" },
                }
            };
            var o6 = new Order
            {
                TableId = tables[5].Id, ServerId = server.Id, Status = "paid",
                CreatedAt = today.AddHours(14), UpdatedAt = today.AddHours(15),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Veg Manchurian").Id, MenuItemName = "Veg Manchurian", MenuItemPrice = 280, Quantity = 2, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Dal Makhani").Id,    MenuItemName = "Dal Makhani",    MenuItemPrice = 320, Quantity = 1, KitchenStatus = "ready" },
                    new() { MenuItemId = Item("Masala Chai").Id,    MenuItemName = "Masala Chai",    MenuItemPrice = 80,  Quantity = 3, KitchenStatus = "ready" },
                }
            };

            db.Orders.AddRange(o1, o2, o3, o4, o5, o6);
            await db.SaveChangesAsync();

            // Create payments for paid orders
            static decimal Sub(Order o)  => o.Items.Sum(i => i.MenuItemPrice * i.Quantity);
            static decimal Tax(decimal s) => Math.Round(s * 0.05m, 2);
            static decimal Svc(decimal s) => Math.Round(s * 0.05m, 2);

            var paymentsToAdd = new[] { o1, o2, o3, o4, o5, o6 }.Select(o =>
            {
                var sub = Sub(o); var tax = Tax(sub); var svc = Svc(sub);
                return new Payment
                {
                    OrderId = o.Id, ProcessedById = cashier.Id, Method = "card",
                    Subtotal = sub, TaxAmount = tax, ServiceCharge = svc,
                    DiscountPercent = 0, DiscountAmount = 0,
                    TotalAmount = sub + tax + svc, ProcessedAt = o.UpdatedAt,
                };
            }).ToList();

            db.Payments.AddRange(paymentsToAdd);

            // Mark tables occupied for the 2 active orders (tables 7 and 8)
            var activeTable7 = tables[6];
            var activeTable8 = tables[7];
            activeTable7.Status = "occupied"; activeTable7.ServerId = server.Id; activeTable7.OccupiedSince = DateTime.UtcNow.AddMinutes(-20);
            activeTable8.Status = "occupied"; activeTable8.ServerId = server.Id; activeTable8.OccupiedSince = DateTime.UtcNow.AddMinutes(-35);

            // Active orders for occupied tables
            var o7 = new Order
            {
                TableId = activeTable7.Id, ServerId = server.Id, Status = "active",
                CreatedAt = DateTime.UtcNow.AddMinutes(-20), UpdatedAt = DateTime.UtcNow.AddMinutes(-20),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Paneer Tikka").Id,    MenuItemName = "Paneer Tikka",    MenuItemPrice = 320, Quantity = 1, KitchenStatus = "preparing" },
                    new() { MenuItemId = Item("Butter Chicken").Id,  MenuItemName = "Butter Chicken",  MenuItemPrice = 420, Quantity = 2, KitchenStatus = "pending"   },
                    new() { MenuItemId = Item("Butter Naan").Id,     MenuItemName = "Butter Naan",     MenuItemPrice = 60,  Quantity = 4, KitchenStatus = "pending"   },
                }
            };
            var o8 = new Order
            {
                TableId = activeTable8.Id, ServerId = server.Id, Status = "active",
                CreatedAt = DateTime.UtcNow.AddMinutes(-35), UpdatedAt = DateTime.UtcNow.AddMinutes(-35),
                Items = new List<OrderItem>
                {
                    new() { MenuItemId = Item("Chicken 65").Id,      MenuItemName = "Chicken 65",      MenuItemPrice = 380, Quantity = 2, KitchenStatus = "ready"     },
                    new() { MenuItemId = Item("Chicken Biryani").Id, MenuItemName = "Chicken Biryani", MenuItemPrice = 380, Quantity = 1, KitchenStatus = "ready"     },
                    new() { MenuItemId = Item("Mango Lassi").Id,     MenuItemName = "Mango Lassi",     MenuItemPrice = 120, Quantity = 2, KitchenStatus = "ready"     },
                }
            };
            db.Orders.AddRange(o7, o8);
            await db.SaveChangesAsync();
        }

        // Seed sample investments if none exist
        if (!db.Investments.Any())
        {
            var admin = db.Users.First(u => u.Role == "admin" || u.Role == "manager");
            var today = DateTime.UtcNow.Date;
            var investments = new List<Investment>
            {
                new() { Category = "ingredients", Description = "Daily vegetable and spice purchase",     Amount = 4500,  Date = today,              CreatedById = admin.Id },
                new() { Category = "ingredients", Description = "Chicken, paneer, dairy products",        Amount = 8200,  Date = today,              CreatedById = admin.Id },
                new() { Category = "utilities",   Description = "Daily LPG cylinder refill",              Amount = 1200,  Date = today,              CreatedById = admin.Id },
                new() { Category = "labor",       Description = "Daily wages — cleaning and kitchen",     Amount = 3000,  Date = today,              CreatedById = admin.Id },
                new() { Category = "ingredients", Description = "Rice, lentils, oil — weekly stock",      Amount = 6000,  Date = today.AddDays(-1),  CreatedById = admin.Id },
                new() { Category = "maintenance", Description = "Kitchen equipment servicing",            Amount = 2500,  Date = today.AddDays(-1),  CreatedById = admin.Id },
                new() { Category = "utilities",   Description = "Electricity bill",                       Amount = 5200,  Date = today.AddDays(-2),  CreatedById = admin.Id },
                new() { Category = "equipment",   Description = "Cutlery and crockery replacement",       Amount = 3800,  Date = today.AddDays(-3),  CreatedById = admin.Id },
            };
            db.Investments.AddRange(investments);
            await db.SaveChangesAsync();
        }
    }
}
