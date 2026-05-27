using System.ComponentModel.DataAnnotations;

namespace RestoAPI.DTOs.Billing;

public class BillDto
{
    public int OrderId { get; set; }
    public int TableNumber { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string OrderTime { get; set; } = string.Empty;
    public List<BillItemDto> Items { get; set; } = [];
    public decimal Subtotal { get; set; }
    public decimal Tax { get; set; }         // 5% of subtotal
    public decimal ServiceCharge { get; set; }  // 5% of subtotal
    public decimal Total { get; set; }
}

public class BillItemDto
{
    public string Name { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal LineTotal { get; set; }
}

public class ProcessPaymentRequest
{
    [Required]
    public string Method { get; set; } = string.Empty;  // cash | card | upi | wallet

    [Range(0, 100)]
    public decimal DiscountPercent { get; set; }

    // Required when Method == "cash" — used to calculate change
    public decimal? CashReceived { get; set; }
}

public class PaymentResultDto
{
    public int PaymentId { get; set; }
    public decimal TotalCharged { get; set; }
    public decimal? ChangeGiven { get; set; }
    public string Method { get; set; } = string.Empty;
}

public class SplitBillRequest
{
    public int SplitCount { get; set; } = 2;
    public string Method { get; set; } = "cash";
    public decimal DiscountPercent { get; set; } = 0;
}

public class SplitBillResultDto
{
    public int SplitCount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal AmountPerPerson { get; set; }
    public List<SplitPersonDto> Splits { get; set; } = [];
}

public class SplitPersonDto
{
    public int PersonNumber { get; set; }
    public decimal Amount { get; set; }
}

public class PaymentHistoryDto
{
    public int PaymentId { get; set; }
    public int OrderId { get; set; }
    public int TableNumber { get; set; }
    public string ServerName { get; set; } = string.Empty;
    public string OrderType { get; set; } = "dine-in";
    public string Method { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime ProcessedAt { get; set; }
    public List<BillItemDto> Items { get; set; } = [];
}
