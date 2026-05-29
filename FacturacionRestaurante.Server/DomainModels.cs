using System.ComponentModel.DataAnnotations;

namespace FacturacionRestaurante.Server;

public enum OrderStatus
{
    Open = 1,
    Closed = 2
}

public enum PaymentMethod
{
    Cash = 1,
    Card = 2,
    Transfer = 3
}

public enum DiscountType
{
    Percentage = 1,
    FixedAmount = 2
}

public class DiningTable
{
    public int Id { get; set; }
    [MaxLength(40)]
    public required string Name { get; set; }
    public bool IsActive { get; set; } = true;
}

public class MenuProduct
{
    public int Id { get; set; }
    [MaxLength(120)]
    public required string Name { get; set; }
    [MaxLength(60)]
    public required string Category { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Order
{
    public int Id { get; set; }
    public int DiningTableId { get; set; }
    public DiningTable? DiningTable { get; set; }
    public DateTime OpenedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ClosedAtUtc { get; set; }
    public OrderStatus Status { get; set; } = OrderStatus.Open;
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public BillingDocument? BillingDocument { get; set; }
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    [MaxLength(100)]
    public required string Name { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal => Quantity * UnitPrice;
}

public class DiscountRule
{
    public int Id { get; set; }
    [MaxLength(30)]
    public required string Code { get; set; }
    [MaxLength(120)]
    public required string Description { get; set; }
    public DiscountType DiscountType { get; set; }
    public decimal Value { get; set; }
    public bool IsActive { get; set; } = true;
}

public class BillingDocument
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    [MaxLength(20)]
    public required string DocumentNumber { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public decimal Subtotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal ServiceChargeAmount { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
