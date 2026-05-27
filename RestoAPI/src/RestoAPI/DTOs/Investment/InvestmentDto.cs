namespace RestoAPI.DTOs.Investment;

public class InvestmentDto
{
    public int Id { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Date { get; set; } = string.Empty;
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class CreateInvestmentRequest
{
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? Date { get; set; }
}

public class InvestmentSummaryDto
{
    public decimal TotalInvestment { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal Profit { get; set; }
    public List<CategoryBreakdownDto> ByCategory { get; set; } = [];
}

public class CategoryBreakdownDto
{
    public string Category { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public int Count { get; set; }
}
