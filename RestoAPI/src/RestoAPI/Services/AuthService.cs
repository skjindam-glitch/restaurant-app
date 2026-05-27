using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RestoAPI.Data;
using RestoAPI.DTOs.Auth;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    Task<UserProfile?> GetProfileAsync(int userId);
}

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    // Screen access matrix — mirrors rolePermissions in the frontend AuthContext.tsx
    private static readonly Dictionary<string, List<string>> RolePermissions = new()
    {
        ["admin"]   = ["dashboard", "tables", "orders", "billing", "kitchen", "menu", "reports", "staff", "investment"],
        ["manager"] = ["tables", "orders", "billing", "kitchen", "menu", "investment"],
        ["server"]  = ["tables", "orders"],
        ["cashier"] = ["billing", "orders"],
        ["kitchen"] = ["kitchen"],
    };

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null; // Invalid credentials — return null so controller returns 401

        var token = GenerateJwt(user);
        var expiry = DateTime.UtcNow.AddHours(12);

        return new LoginResponse
        {
            Token     = token,
            ExpiresAt = expiry,
            User      = MapToProfile(user),
        };
    }

    public async Task<UserProfile?> GetProfileAsync(int userId)
    {
        var user = await db.Users.FindAsync(userId);
        return user is null ? null : MapToProfile(user);
    }

    // Builds a signed JWT with role + userId claims; 12-hour expiry
    private string GenerateJwt(User user)
    {
        var key     = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        var creds   = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddHours(12);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,   user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role,               user.Role),
            new Claim("name",                        user.Name),
        };

        var jwt = new JwtSecurityToken(
            issuer:             config["Jwt:Issuer"],
            audience:           config["Jwt:Audience"],
            claims:             claims,
            expires:            expires,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    private static UserProfile MapToProfile(User user)
    {
        // Use custom per-user permissions if admin set them; otherwise fall back to role defaults
        List<string> perms;
        if (!string.IsNullOrEmpty(user.CustomPermissions))
        {
            perms = user.CustomPermissions.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList();
        }
        else
        {
            perms = RolePermissions.GetValueOrDefault(user.Role, []);
        }

        return new UserProfile
        {
            Id          = user.Id,
            Name        = user.Name,
            Email       = user.Email,
            Role        = user.Role,
            Avatar      = user.Avatar,
            Permissions = perms,
        };
    }
}
