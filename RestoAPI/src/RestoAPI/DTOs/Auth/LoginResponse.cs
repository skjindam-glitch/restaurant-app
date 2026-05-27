namespace RestoAPI.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;

    // Tells the client when to call /auth/refresh before the token expires
    public DateTime ExpiresAt { get; set; }

    public UserProfile User { get; set; } = null!;
}

public class UserProfile
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Avatar { get; set; } = string.Empty;

    // Pre-computed screen access list — matches rolePermissions in the frontend AuthContext
    public List<string> Permissions { get; set; } = [];
}
