namespace RestoAPI.DTOs.Staff;

public class StaffDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? PlainPassword { get; set; }
    public string? CustomPermissions { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateStaffRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
}

public class UpdateStaffRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Password { get; set; }
    public string Role { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public string? CustomPermissions { get; set; }
}
