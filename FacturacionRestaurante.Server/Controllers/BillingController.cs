using Microsoft.AspNetCore.Mvc;

namespace FacturacionRestaurante.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillingController(BillingService billingService) : ControllerBase
{
    [HttpGet("tables")]
    public async Task<ActionResult<IReadOnlyCollection<DiningTableStatusDto>>> GetTables(CancellationToken cancellationToken)
    {
        var result = await billingService.GetTablesAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("menu")]
    public async Task<ActionResult<IReadOnlyCollection<MenuProductDto>>> GetMenu(CancellationToken cancellationToken)
    {
        var result = await billingService.GetMenuProductsAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPost("menu")]
    public async Task<ActionResult<MenuProductDto>> CreateMenu(
        [FromBody] CreateMenuProductRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await billingService.CreateMenuProductAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("menu/{id:int}/price")]
    public async Task<ActionResult<MenuProductDto>> UpdateMenuPrice(
        int id,
        [FromBody] UpdateMenuProductPriceRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await billingService.UpdateMenuProductPriceAsync(id, request.Price, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("menu/{id:int}")]
    public async Task<ActionResult<MenuProductDto>> UpdateMenuProduct(
        int id,
        [FromBody] UpdateMenuProductRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await billingService.UpdateMenuProductAsync(id, request, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("orders")]
    public async Task<ActionResult<CreateOrderResultDto>> CreateOrder(
        [FromBody] CreateOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await billingService.CreateOrderAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("orders/open")]
    public async Task<ActionResult<IReadOnlyCollection<OpenOrderSummaryDto>>> GetOpenOrders(CancellationToken cancellationToken)
    {
        var result = await billingService.GetOpenOrdersAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("orders/{orderId:int}/prebill")]
    public async Task<ActionResult<PrebillResultDto>> GetPrebill(
        int orderId,
        [FromQuery] string? discountCode,
        [FromQuery] string? paymentMethod,
        CancellationToken cancellationToken)
    {
        try
        {
            var parsedPaymentMethod = ParsePaymentMethod(paymentMethod);
            var result = await billingService.BuildPrebillAsync(orderId, discountCode, parsedPaymentMethod, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("orders/{orderId:int}/close")]
    public async Task<ActionResult<CloseOrderResultDto>> CloseOrder(
        int orderId,
        [FromBody] CloseOrderRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var parsedPaymentMethod = ParsePaymentMethod(request.PaymentMethod);
            var result = await billingService.CloseOrderAsync(orderId, request.DiscountCode, parsedPaymentMethod, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("dashboard/monthly")]
    public async Task<ActionResult<DashboardSummaryDto>> GetMonthlyDashboard(CancellationToken cancellationToken)
    {
        var result = await billingService.GetCurrentMonthDashboardAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("reports/excel")]
    public async Task<IActionResult> DownloadBillingExcel(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        try
        {
            var bytes = await billingService.BuildBillingExcelAsync(from, to, cancellationToken);
            var fileName = $"facturacion-{DateTime.UtcNow:yyyyMMdd-HHmm}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("reports/products-excel")]
    public async Task<IActionResult> DownloadProductDetailExcel(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        CancellationToken cancellationToken)
    {
        try
        {
            var bytes = await billingService.BuildProductDetailExcelAsync(from, to, cancellationToken);
            var fileName = $"facturacion-productos-{DateTime.UtcNow:yyyyMMdd-HHmm}.xlsx";
            return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static PaymentMethod ParsePaymentMethod(string? paymentMethod)
    {
        if (string.IsNullOrWhiteSpace(paymentMethod))
        {
            return PaymentMethod.Cash;
        }

        if (Enum.TryParse<PaymentMethod>(paymentMethod, true, out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException("Método de pago inválido. Usa Cash, Card o Transfer.");
    }
}
