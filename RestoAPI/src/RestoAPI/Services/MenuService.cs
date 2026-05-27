using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Menu;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface IMenuService
{
    Task<List<MenuItemDto>> GetAllAsync(string? category, string? search, bool? availableOnly);
    Task<List<string>> GetCategoriesAsync();
    Task<MenuItemDto?> GetByIdAsync(int id);
    Task<MenuItemDto> CreateAsync(CreateMenuItemRequest request);
    Task<MenuItemDto?> UpdateAsync(int id, UpdateMenuItemRequest request);
    Task<bool> DeleteAsync(int id);
    Task<MenuItemDto?> ToggleAvailabilityAsync(int id);
}

public class MenuService(AppDbContext db) : IMenuService
{
    public async Task<List<MenuItemDto>> GetAllAsync(string? category, string? search, bool? availableOnly)
    {
        var query = db.MenuItems.AsNoTracking();

        if (!string.IsNullOrEmpty(category) && category != "All")
            query = query.Where(m => m.Category == category);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(m => m.Name.Contains(search));

        if (availableOnly == true)
            query = query.Where(m => m.IsAvailable);

        return await query.OrderBy(m => m.Category).ThenBy(m => m.Name)
            .Select(m => Map(m)).ToListAsync();
    }

    public async Task<List<string>> GetCategoriesAsync() =>
        await db.MenuItems.Select(m => m.Category).Distinct().OrderBy(c => c).ToListAsync();

    public async Task<MenuItemDto?> GetByIdAsync(int id)
    {
        var item = await db.MenuItems.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
        return item is null ? null : Map(item);
    }

    public async Task<MenuItemDto> CreateAsync(CreateMenuItemRequest request)
    {
        var item = new MenuItem
        {
            Name        = request.Name,
            Category    = request.Category,
            Price       = request.Price,
            IsVeg       = request.IsVeg,
            IsPopular   = request.IsPopular,
            Description = request.Description,
            ImageUrl    = request.ImageUrl,
            IsAvailable = true,
        };
        db.MenuItems.Add(item);
        await db.SaveChangesAsync();
        return Map(item);
    }

    public async Task<MenuItemDto?> UpdateAsync(int id, UpdateMenuItemRequest request)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return null;

        item.Name        = request.Name;
        item.Category    = request.Category;
        item.Price       = request.Price;
        item.IsVeg       = request.IsVeg;
        item.IsPopular   = request.IsPopular;
        item.IsAvailable = request.IsAvailable;
        item.Description = request.Description;
        item.ImageUrl    = request.ImageUrl;
        item.UpdatedAt   = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Map(item);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return false;
        db.MenuItems.Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<MenuItemDto?> ToggleAvailabilityAsync(int id)
    {
        var item = await db.MenuItems.FindAsync(id);
        if (item is null) return null;
        item.IsAvailable = !item.IsAvailable;
        item.UpdatedAt   = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Map(item);
    }

    private static MenuItemDto Map(MenuItem m) => new()
    {
        Id          = m.Id,
        Name        = m.Name,
        Category    = m.Category,
        Price       = m.Price,
        IsVeg       = m.IsVeg,
        IsPopular   = m.IsPopular,
        IsAvailable = m.IsAvailable,
        Description = m.Description,
        ImageUrl    = m.ImageUrl,
    };
}
