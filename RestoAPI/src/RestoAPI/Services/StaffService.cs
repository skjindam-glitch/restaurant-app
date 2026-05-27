using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Staff;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface IStaffService
{
    Task<List<StaffDto>> GetAllAsync();
    Task<StaffDto?> GetByIdAsync(int id);
    Task<StaffDto> CreateAsync(CreateStaffRequest request);
    Task<StaffDto?> UpdateAsync(int id, UpdateStaffRequest request);
    Task<bool> DeleteAsync(int id);
}

public class StaffService(AppDbContext db) : IStaffService
{
    public async Task<List<StaffDto>> GetAllAsync() =>
        await db.Users.AsNoTracking().OrderBy(u => u.Name).Select(u => Map(u)).ToListAsync();

    public async Task<StaffDto?> GetByIdAsync(int id)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
        return user is null ? null : Map(user);
    }

    public async Task<StaffDto> CreateAsync(CreateStaffRequest request)
    {
        var user = new User
        {
            Name          = request.Name,
            Email         = request.Email,
            PasswordHash  = BCrypt.Net.BCrypt.HashPassword(request.Password),
            PlainPassword = request.Password,
            Role          = request.Role,
            Avatar        = string.IsNullOrEmpty(request.Avatar)
                                ? string.Concat(request.Name.Split(' ').Take(2).Select(w => w[0].ToString().ToUpper()))
                                : request.Avatar,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Map(user);
    }

    public async Task<StaffDto?> UpdateAsync(int id, UpdateStaffRequest request)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return null;

        user.Name      = request.Name;
        user.Email     = request.Email;
        user.Role      = request.Role;
        user.Avatar    = request.Avatar;
        user.IsActive  = request.IsActive;
        user.UpdatedAt = DateTime.UtcNow;
        user.CustomPermissions = request.CustomPermissions;

        if (!string.IsNullOrEmpty(request.Password))
        {
            user.PasswordHash  = BCrypt.Net.BCrypt.HashPassword(request.Password);
            user.PlainPassword = request.Password;
        }

        await db.SaveChangesAsync();
        return Map(user);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return false;
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return true;
    }

    private static StaffDto Map(User u) => new()
    {
        Id                = u.Id,
        Name              = u.Name,
        Email             = u.Email,
        Role              = u.Role,
        Avatar            = u.Avatar,
        IsActive          = u.IsActive,
        PlainPassword     = u.PlainPassword,
        CustomPermissions = u.CustomPermissions,
        CreatedAt         = u.CreatedAt,
    };
}
