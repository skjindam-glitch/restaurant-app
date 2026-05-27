namespace RestoAPI.Models;

public class RestaurantTable
{
    public int Id { get; set; }
    public int Number { get; set; }
    public int Seats { get; set; }

    // Zones: ground-floor | first-floor | garden | rooftop | vip | bar
    public string Zone { get; set; } = "ground-floor";

    // Statuses: available | occupied | reserved | billing | dirty
    public string Status { get; set; } = "available";

    // Assigned server when table is occupied
    public int? ServerId { get; set; }
    public User? Server { get; set; }

    // Timestamp when guests were seated — used for elapsed-time display on KDS
    public DateTime? OccupiedSince { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Order> Orders { get; set; } = [];
}
