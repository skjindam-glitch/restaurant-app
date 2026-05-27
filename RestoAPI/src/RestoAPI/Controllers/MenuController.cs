using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Menu;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MenuController(IMenuService menuService) : ControllerBase
{
    /// <summary>Get menu items. Supports ?category=Mains&amp;search=butter&amp;availableOnly=true</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? category,
        [FromQuery] string? search,
        [FromQuery] bool? availableOnly) =>
        Ok(await menuService.GetAllAsync(category, search, availableOnly));

    /// <summary>Returns the distinct category list for the filter chips in the Orders screen.</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() =>
        Ok(await menuService.GetCategoriesAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await menuService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>Create a new menu item. Manager only.</summary>
    [HttpPost]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> Create([FromBody] CreateMenuItemRequest request)
    {
        var item = await menuService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    /// <summary>Update an existing menu item. Manager only.</summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateMenuItemRequest request)
    {
        var item = await menuService.UpdateAsync(id, request);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>Delete a menu item. Manager only.</summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await menuService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    /// <summary>Toggle available/unavailable — used on the Menu management page.</summary>
    [HttpPatch("{id:int}/availability")]
    [Authorize(Roles = "manager,admin")]
    public async Task<IActionResult> ToggleAvailability(int id)
    {
        var item = await menuService.ToggleAvailabilityAsync(id);
        return item is null ? NotFound() : Ok(item);
    }
}
