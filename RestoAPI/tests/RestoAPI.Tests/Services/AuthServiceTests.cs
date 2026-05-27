using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RestoAPI.Data;
using RestoAPI.DTOs.Auth;
using RestoAPI.Models;
using RestoAPI.Services;

namespace RestoAPI.Tests.Services;

public class AuthServiceTests
{
    private static (AppDbContext db, IConfiguration config) Setup()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        var db = new AppDbContext(options);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"]         = "TestSuperSecretKeyForUnitTests2026!!",
                ["Jwt:Issuer"]      = "RestoAPI",
                ["Jwt:Audience"]    = "RestoApp",
                ["Jwt:ExpiryHours"] = "12",
            })
            .Build();

        return (db, config);
    }

    [Fact]
    public async Task Login_ReturnsNull_WhenUserNotFound()
    {
        var (db, config) = Setup();
        var svc = new AuthService(db, config);

        var result = await svc.LoginAsync(new LoginRequest { Email = "nobody@test.com", Password = "pass" });

        Assert.Null(result);
    }

    [Fact]
    public async Task Login_ReturnsNull_WhenPasswordWrong()
    {
        var (db, config) = Setup();
        var user = new User
        {
            Name         = "Manager",
            Email        = "mgr@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correct"),
            Role         = "manager",
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var svc    = new AuthService(db, config);
        var result = await svc.LoginAsync(new LoginRequest { Email = "mgr@test.com", Password = "wrong" });

        Assert.Null(result);
    }

    [Fact]
    public async Task Login_ReturnsToken_WhenCredentialsValid()
    {
        var (db, config) = Setup();
        var user = new User
        {
            Name         = "Manager",
            Email        = "mgr@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            Role         = "manager",
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var svc    = new AuthService(db, config);
        var result = await svc.LoginAsync(new LoginRequest { Email = "mgr@test.com", Password = "password123" });

        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.Equal("manager", result.User.Role);
    }

    [Fact]
    public async Task Login_ReturnsNull_WhenUserInactive()
    {
        var (db, config) = Setup();
        var user = new User
        {
            Name         = "Fired",
            Email        = "fired@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
            Role         = "server",
            IsActive     = false,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var svc    = new AuthService(db, config);
        var result = await svc.LoginAsync(new LoginRequest { Email = "fired@test.com", Password = "password123" });

        Assert.Null(result);
    }
}
