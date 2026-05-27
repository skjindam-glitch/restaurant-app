using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Tables;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TablesController(ITableService tableService) : ControllerBase
{
    /// <summary>Get all tables. Optionally filter by status (available|occupied|reserved|billing|dirty).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status) =>
        Ok(await tableService.GetAllAsync(status));

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var table = await tableService.GetByIdAsync(id);
        return table is null ? NotFound() : Ok(table);
    }

    /// <summary>Update a table's status. Manager and server roles only.</summary>
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "manager,server,admin")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateTableStatusRequest request)
    {
        var table = await tableService.UpdateStatusAsync(id, request);
        return table is null ? NotFound() : Ok(table);
    }

    /// <summary>Seat guests — marks table occupied and assigns a server.</summary>
    [HttpPost("{id:int}/seat")]
    [Authorize(Roles = "manager,server,admin")]
    public async Task<IActionResult> SeatGuests(int id, [FromBody] SeatGuestsRequest request)
    {
        var table = await tableService.SeatGuestsAsync(id, request);
        return table is null ? NotFound() : Ok(table);
    }

    /// <summary>Create a new table. Manager and admin only.</summary>
    [HttpPost]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> Create([FromBody] CreateTableRequest request) =>
        Ok(await tableService.CreateAsync(request));

    /// <summary>Delete a table. Manager and admin only.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> Delete(int id) =>
        await tableService.DeleteAsync(id) ? Ok() : NotFound();
}
