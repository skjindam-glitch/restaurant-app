using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestoAPI.DTOs.Staff;
using RestoAPI.Services;

namespace RestoAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class StaffController(IStaffService staffService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await staffService.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var staff = await staffService.GetByIdAsync(id);
        return staff is null ? NotFound() : Ok(staff);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStaffRequest request) =>
        Ok(await staffService.CreateAsync(request));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateStaffRequest request)
    {
        var result = await staffService.UpdateAsync(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await staffService.DeleteAsync(id) ? Ok() : NotFound();
}
