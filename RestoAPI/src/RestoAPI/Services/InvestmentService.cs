using Microsoft.EntityFrameworkCore;
using RestoAPI.Data;
using RestoAPI.DTOs.Investment;
using RestoAPI.Models;

namespace RestoAPI.Services;

public interface IInvestmentService
{
    Task<List<InvestmentDto>> GetByDateAsync(DateTime date);
    Task<InvestmentDto> CreateAsync(int userId, CreateInvestmentRequest request);
    Task<bool> DeleteAsync(int id);
    Task<InvestmentSummaryDto> GetSummaryAsync(DateTime date);
}

public class InvestmentService(AppDbContext db) : IInvestmentService
{
    public async Task<List<InvestmentDto>> GetByDateAsync(DateTime date)
    {
        var start = date.Date;
        var end   = start.AddDays(1);
        return await db.Investments
            .Include(i => i.CreatedBy)
            .Where(i => i.Date >= start && i.Date < end)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => Map(i))
            .ToListAsync();
    }

    public async Task<InvestmentDto> CreateAsync(int userId, CreateInvestmentRequest request)
    {
        var date = request.Date is not null && DateTime.TryParse(request.Date, out var d)
            ? d.Date
            : DateTime.UtcNow.Date;

        var inv = new Investment
        {
            Category    = request.Category,
            Description = request.Description,
            Amount      = request.Amount,
            Date        = date,
            CreatedById = userId,
        };
        db.Investments.Add(inv);
        await db.SaveChangesAsync();
        await db.Entry(inv).Reference(i => i.CreatedBy).LoadAsync();
        return Map(inv);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var inv = await db.Investments.FindAsync(id);
        if (inv is null) return false;
        db.Investments.Remove(inv);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<InvestmentSummaryDto> GetSummaryAsync(DateTime date)
    {
        var start = date.Date;
        var end   = start.AddDays(1);

        var totalInvestment = await db.Investments
            .Where(i => i.Date >= start && i.Date < end)
            .SumAsync(i => (decimal?)i.Amount) ?? 0;

        var totalRevenue = await db.Payments
            .Where(p => p.ProcessedAt >= start && p.ProcessedAt < end)
            .SumAsync(p => (decimal?)p.TotalAmount) ?? 0;

        var byCategory = await db.Investments
            .Where(i => i.Date >= start && i.Date < end)
            .GroupBy(i => i.Category)
            .Select(g => new CategoryBreakdownDto
            {
                Category = g.Key,
                Amount   = g.Sum(i => i.Amount),
                Count    = g.Count(),
            })
            .ToListAsync();

        return new InvestmentSummaryDto
        {
            TotalInvestment = totalInvestment,
            TotalRevenue    = totalRevenue,
            Profit          = totalRevenue - totalInvestment,
            ByCategory      = byCategory,
        };
    }

    private static InvestmentDto Map(Investment i) => new()
    {
        Id            = i.Id,
        Category      = i.Category,
        Description   = i.Description,
        Amount        = i.Amount,
        Date          = i.Date.ToString("yyyy-MM-dd"),
        CreatedByName = i.CreatedBy?.Name ?? string.Empty,
        CreatedAt     = i.CreatedAt,
    };
}
