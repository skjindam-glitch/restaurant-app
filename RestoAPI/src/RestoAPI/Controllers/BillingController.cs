using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Billing;
using RestoAPI.Services;
using System.Security.Claims;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BillingController(IBillingService billingService) : ControllerBase
{
    /// <summary>Lists all orders in billing status — the cashier's work queue.</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingBills() =>
        Ok(await billingService.GetPendingBillsAsync());

    /// <summary>Returns itemised bill with tax, service charge, and totals for a specific order.</summary>
    [HttpGet("{orderId:int}")]
    public async Task<IActionResult> GetBill(int orderId)
    {
        var bill = await billingService.GetBillAsync(orderId);
        return bill is null ? NotFound() : Ok(bill);
    }

    /// <summary>Process payment — calculates final total, records payment, marks order paid, table dirty.</summary>
    [HttpPost("{orderId:int}/pay")]
    [Authorize(Roles = "manager,cashier,admin")]
    public async Task<IActionResult> ProcessPayment(int orderId, [FromBody] ProcessPaymentRequest request)
    {
        var processedById = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await billingService.ProcessPaymentAsync(orderId, processedById, request);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>Returns recent payment history (last 200 payments by default).</summary>
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory([FromQuery] int limit = 200) =>
        Ok(await billingService.GetHistoryAsync(limit));

    /// <summary>Calculate split bill — returns per-person amounts without processing payment.</summary>
    [HttpPost("{orderId:int}/split")]
    public async Task<IActionResult> GetSplitBill(int orderId, [FromBody] SplitBillRequest request)
    {
        var result = await billingService.GetSplitBillAsync(orderId, request);
        return result is null ? NotFound() : Ok(result);
    }
}
