using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Orders;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController(IOrderService orderService) : ControllerBase
{
    /// <summary>Get orders. Supports ?status=active&amp;tableId=3</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int? tableId) =>
        Ok(await orderService.GetAllAsync(status, tableId));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var order = await orderService.GetByIdAsync(id);
        return order is null ? NotFound() : Ok(order);
    }

    /// <summary>Create a new order. Server ID is taken from the JWT — no need to pass it in the body.</summary>
    [HttpPost]
    [Authorize(Roles = "manager,server,cashier,admin")]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest request)
    {
        var serverId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var order    = await orderService.CreateAsync(serverId, request);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    /// <summary>Replace the item list on an existing order (before it goes to kitchen).</summary>
    [HttpPut("{id:int}/items")]
    [Authorize(Roles = "manager,server,cashier,admin")]
    public async Task<IActionResult> UpdateItems(int id, [FromBody] UpdateOrderItemsRequest request)
    {
        var order = await orderService.UpdateItemsAsync(id, request);
        return order is null ? NotFound() : Ok(order);
    }

    /// <summary>Send order to kitchen — makes it visible on the KDS.</summary>
    [HttpPost("{id:int}/send-to-kitchen")]
    [Authorize(Roles = "manager,server,cashier,admin")]
    public async Task<IActionResult> SendToKitchen(int id)
    {
        var order = await orderService.SendToKitchenAsync(id);
        return order is null ? NotFound() : Ok(order);
    }

    /// <summary>Append new items to an existing order without touching items already in kitchen.</summary>
    [HttpPost("{id:int}/add-items")]
    [Authorize(Roles = "manager,server,cashier,admin")]
    public async Task<IActionResult> AddItems(int id, [FromBody] AddOrderItemsRequest request)
    {
        var order = await orderService.AddItemsAsync(id, request);
        return order is null ? NotFound() : Ok(order);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromQuery] string status)
    {
        var order = await orderService.UpdateStatusAsync(id, status);
        return order is null ? NotFound() : Ok(order);
    }
}
