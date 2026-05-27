namespace RestoAPI.Models;

public class Payment
{
    public int Id { get; set; }

    public int OrderId { get; set; }
    public Order Order { get; set; } = null!;

    // Methods: cash | card | upi | wallet
    public string Method { get; set; } = string.Empty;

    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }

    // Only populated for cash payments — used to show change-to-return
    public decimal? CashReceived { get; set; }
    public decimal? ChangeGiven { get; set; }

    public int ProcessedById { get; set; }
    public User ProcessedBy { get; set; } = null!;

    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}
