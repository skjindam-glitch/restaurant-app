using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RestoAPI.Data;
using RestoAPI.Services;

namespace RestoAPI.Extensions;

public static class ServiceExtensions
{
    public static IServiceCollection AddDatabase(this IServiceCollection services, IConfiguration config)
    {
        var connectionString = config.GetConnectionString("DefaultConnection");
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseSqlServer(connectionString, sqlOpt =>
                sqlOpt.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(30), errorNumbersToAdd: null)));
        return services;
    }

    public static IServiceCollection AddJwt(this IServiceCollection services, IConfiguration config)
    {
        var key = Encoding.UTF8.GetBytes(config["Jwt:Key"]!);

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opt =>
            {
                opt.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey         = new SymmetricSecurityKey(key),
                    ValidateIssuer           = true,
                    ValidIssuer              = config["Jwt:Issuer"],
                    ValidateAudience         = true,
                    ValidAudience            = config["Jwt:Audience"],
                    ValidateLifetime         = true,
                    ClockSkew                = TimeSpan.Zero,
                };
            });

        return services;
    }

    public static IServiceCollection AddSwagger(this IServiceCollection services)
    {
        services.AddSwaggerGen(opt =>
        {
            opt.SwaggerDoc("v1", new OpenApiInfo { Title = "Resto API", Version = "v1" });

            // Allows the Swagger UI to send the Bearer token
            var scheme = new OpenApiSecurityScheme
            {
                Name         = "Authorization",
                Type         = SecuritySchemeType.Http,
                Scheme       = "bearer",
                BearerFormat = "JWT",
                In           = ParameterLocation.Header,
                Reference    = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            };
            opt.AddSecurityDefinition("Bearer", scheme);
            opt.AddSecurityRequirement(new OpenApiSecurityRequirement { { scheme, Array.Empty<string>() } });
        });

        return services;
    }

    public static IServiceCollection AddAppServices(this IServiceCollection services)
    {
        services.AddScoped<IAuthService,        AuthService>();
        services.AddScoped<ITableService,       TableService>();
        services.AddScoped<IMenuService,        MenuService>();
        services.AddScoped<IOrderService,       OrderService>();
        services.AddScoped<IKitchenService,     KitchenService>();
        services.AddScoped<IBillingService,     BillingService>();
        services.AddScoped<IDashboardService,   DashboardService>();
        services.AddScoped<IStaffService,       StaffService>();
        services.AddScoped<IInvestmentService,    InvestmentService>();
        services.AddScoped<INotificationService,  NotificationService>();
        return services;
    }
}
