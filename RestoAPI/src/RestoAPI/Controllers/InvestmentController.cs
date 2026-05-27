using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Investment;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "manager,admin")]
public class InvestmentController(IInvestmentService investmentService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetByDate([FromQuery] string? date)
    {
        var d = date is not null && DateTime.TryParse(date, out var parsed) ? parsed : DateTime.UtcNow;
        return Ok(await investmentService.GetByDateAsync(d));
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string? date)
    {
        var d = date is not null && DateTime.TryParse(date, out var parsed) ? parsed : DateTime.UtcNow;
        return Ok(await investmentService.GetSummaryAsync(d));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInvestmentRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await investmentService.CreateAsync(userId, request));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await investmentService.DeleteAsync(id) ? Ok() : NotFound();
}
