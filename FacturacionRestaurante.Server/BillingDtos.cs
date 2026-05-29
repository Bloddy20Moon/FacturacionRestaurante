namespace FacturacionRestaurante.Server;

public record OpenOrderSummaryDto(int OrderId, int TableId, string TableName, DateTime OpenedAtUtc, int ItemCount);
public record DiningTableStatusDto(int TableId, string TableName, bool IsActive, int? OpenOrderId);
public record MenuProductDto(int Id, string Name, string Category, decimal Price);
public record UpdateMenuProductPriceRequest(decimal Price);
public record CreateMenuProductRequest(string Name, string Category, decimal Price);

public record CreateOrderItemRequest(int ProductId, decimal Quantity);
public record CreateOrderRequest(int TableId, IReadOnlyCollection<CreateOrderItemRequest> Items);
public record CreateOrderResultDto(int OrderId, int TableId, string TableName, decimal Subtotal, int ItemCount);

public record PrebillItemDto(string Name, decimal Quantity, decimal UnitPrice, decimal LineTotal);

public record PrebillResultDto(
    int OrderId,
    string TableName,
    string? AppliedDiscountCode,
    string PaymentMethod,
    decimal Subtotal,
    decimal DiscountAmount,
    decimal TaxAmount,
    decimal ServiceChargeAmount,
    decimal Total,
    IReadOnlyCollection<PrebillItemDto> Items);

public record CloseOrderRequest(string? DiscountCode, string? PaymentMethod);

public record CloseOrderResultDto(
    int OrderId,
    string DocumentNumber,
    string PaymentMethod,
    DateTime ClosedAtUtc,
    decimal Total);

public record RevenueByDayDto(int Day, decimal TotalRevenue);

public record DashboardSummaryDto(
    int Year,
    int Month,
    decimal RevenueMonth,
    int TicketsIssued,
    int OpenOrders,
    IReadOnlyCollection<RevenueByDayDto> RevenueByDay);
