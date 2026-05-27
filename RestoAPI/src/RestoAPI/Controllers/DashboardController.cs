using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "manager,admin")]
public class DashboardController(IDashboardService dashboardService) : ControllerBase
{
    /// <summary>Today vs yesterday KPIs: revenue, orders, active tables, avg order time.</summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary() =>
        Ok(await dashboardService.GetSummaryAsync());

    /// <summary>Count of tables in each status — drives the donut chart.</summary>
    [HttpGet("tables")]
    public async Task<IActionResult> GetTableStatus() =>
        Ok(await dashboardService.GetTableStatusAsync());

    /// <summary>Top N menu items by order count. Default limit=5.</summary>
    [HttpGet("top-items")]
    public async Task<IActionResult> GetTopItems([FromQuery] int limit = 5) =>
        Ok(await dashboardService.GetTopItemsAsync(limit));

    /// <summary>Top N staff by total sales from paid orders. Default limit=5.</summary>
    [HttpGet("top-staff")]
    public async Task<IActionResult> GetTopStaff([FromQuery] int limit = 5) =>
        Ok(await dashboardService.GetTopStaffAsync(limit));

    /// <summary>Revenue and order count split by order type: dine-in / takeaway / online. Period: today|week|month|all.</summary>
    [HttpGet("order-types")]
    public async Task<IActionResult> GetOrderTypeBreakdown([FromQuery] string period = "today") =>
        Ok(await dashboardService.GetOrderTypeBreakdownAsync(period));
}
