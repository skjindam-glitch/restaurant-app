namespace RestoAPI.DTOs.Dashboard;

public class DashboardSummaryDto
{
    public KpiDto Revenue { get; set; } = null!;
    public KpiDto TotalOrders { get; set; } = null!;
    public KpiDto ActiveTables { get; set; } = null!;
    public KpiDto AvgOrderTime { get; set; } = null!;
}

public class KpiDto
{
    public string Value { get; set; } = string.Empty;
    public string Change { get; set; } = string.Empty;
    public bool IsUp { get; set; }
}

public class TableStatusSummaryDto
{
    public int Available { get; set; }
    public int Occupied { get; set; }
    public int Reserved { get; set; }
    public int Billing { get; set; }
    public int Dirty { get; set; }
    public int Total { get; set; }
}

public class TopMenuItemDto
{
    public string Name { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal Revenue { get; set; }
}

public class TopStaffDto
{
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public int OrderCount { get; set; }
    public decimal TotalSales { get; set; }
}

public class OrderTypeBreakdownDto
{
    public decimal DineIn { get; set; }
    public int DineInCount { get; set; }
    public decimal Takeaway { get; set; }
    public int TakeawayCount { get; set; }
    public decimal Online { get; set; }
    public int OnlineCount { get; set; }
}
