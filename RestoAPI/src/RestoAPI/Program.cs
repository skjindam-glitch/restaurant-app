using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.Extensions;
using RestoAPI.Middleware;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddDatabase(builder.Configuration);
builder.Services.AddJwt(builder.Configuration);
builder.Services.AddSwagger();
builder.Services.AddAppServices();

builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p =>
        p.WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["*"])
         .AllowAnyHeader()
         .AllowAnyMethod()));

var app = builder.Build();

// Apply EF migrations and seed reference data on first run
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();

    // Create new tables that may not exist in upgraded databases
    db.Database.ExecuteSqlRaw(@"
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Investments' AND xtype='U')
        CREATE TABLE Investments (
            Id           INT IDENTITY(1,1) PRIMARY KEY,
            Category     NVARCHAR(100)  NOT NULL,
            Description  NVARCHAR(500)  NOT NULL DEFAULT '',
            Amount       DECIMAL(10,2)  NOT NULL,
            Date         DATE           NOT NULL,
            CreatedById  INT            NOT NULL REFERENCES Users(Id),
            CreatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE()
        )");

    // Add new columns to Users table if upgrading from older schema
    db.Database.ExecuteSqlRaw(@"
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='PlainPassword')
            ALTER TABLE Users ADD PlainPassword NVARCHAR(200) NULL;
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Users') AND name='CustomPermissions')
            ALTER TABLE Users ADD CustomPermissions NVARCHAR(500) NULL;");

    // Create Notifications table for the notification system
    db.Database.ExecuteSqlRaw(@"
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
        CREATE TABLE Notifications (
            Id           INT IDENTITY(1,1) PRIMARY KEY,
            Type         NVARCHAR(50)   NOT NULL DEFAULT 'system',
            Title        NVARCHAR(200)  NOT NULL,
            Message      NVARCHAR(1000) NOT NULL,
            TargetRole   NVARCHAR(50)   NULL,
            CreatedById  INT            NOT NULL REFERENCES Users(Id),
            IsRead       BIT            NOT NULL DEFAULT 0,
            CreatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE()
        )");

    // Add Zone to Tables and OrderType to Orders if upgrading from older schema
    db.Database.ExecuteSqlRaw(@"
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Tables') AND name='Zone')
            ALTER TABLE Tables ADD Zone NVARCHAR(50) NOT NULL DEFAULT 'ground-floor';
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id=OBJECT_ID('Orders') AND name='OrderType')
            ALTER TABLE Orders ADD OrderType NVARCHAR(20) NOT NULL DEFAULT 'dine-in';");

    await SeedData.SeedAsync(db);
}

app.UseMiddleware<ExceptionMiddleware>();

// Enable Swagger in Development and optionally in Production via config flag
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("EnableSwagger"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
