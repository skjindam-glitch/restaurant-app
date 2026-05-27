using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Kitchen;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class KitchenController(IKitchenService kitchenService) : ControllerBase
{
    /// <summary>Returns all in-flight orders on the KDS. Optional ?status=pending|preparing|ready filter.</summary>
    [HttpGet]
    public async Task<IActionResult> GetActiveOrders([FromQuery] string? status) =>
        Ok(await kitchenService.GetActiveOrdersAsync(status));

    /// <summary>Advance a single item through pending→preparing→ready.</summary>
    [HttpPatch("{orderId:int}/items/{itemId:int}/status")]
    [Authorize(Roles = "manager,kitchen,admin")]
    public async Task<IActionResult> UpdateItemStatus(
        int orderId, int itemId, [FromBody] UpdateKitchenItemStatusRequest request)
    {
        var item = await kitchenService.UpdateItemStatusAsync(orderId, itemId, request);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>Mark all items on an order as served — transitions order to billing and table to billing.</summary>
    [HttpPost("{orderId:int}/serve")]
    [Authorize(Roles = "manager,kitchen,server,admin")]
    public async Task<IActionResult> MarkAllServed(int orderId)
    {
        var order = await kitchenService.MarkAllServedAsync(orderId);
        return order is null ? NotFound() : Ok(order);
    }
}
