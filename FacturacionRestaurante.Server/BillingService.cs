using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace FacturacionRestaurante.Server;

public class BillingService(BillingDbContext dbContext)
{
    private const decimal IncludedTaxRate = 0.18m;
    private const decimal CardTransferSurchargeRate = 0.05m;

    public async Task<IReadOnlyCollection<DiningTableStatusDto>> GetTablesAsync(CancellationToken cancellationToken)
    {
        var openOrdersByTable = await dbContext.Orders
            .AsNoTracking()
            .Where(x => x.Status == OrderStatus.Open)
            .GroupBy(x => x.DiningTableId)
            .Select(g => new { TableId = g.Key, OpenOrderId = g.Max(x => x.Id) })
            .ToDictionaryAsync(x => x.TableId, x => (int?)x.OpenOrderId, cancellationToken);

        var tables = await dbContext.DiningTables
            .AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => new DiningTableStatusDto(
                x.Id,
                x.Name,
                x.IsActive,
                openOrdersByTable.ContainsKey(x.Id) ? openOrdersByTable[x.Id] : null))
            .ToListAsync(cancellationToken);

        return tables;
    }

    public async Task<IReadOnlyCollection<MenuProductDto>> GetMenuProductsAsync(CancellationToken cancellationToken)
    {
        return await dbContext.MenuProducts
            .AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.Category)
            .ThenBy(x => x.Name)
            .Select(x => new MenuProductDto(x.Id, x.Name, x.Category, x.Price))
            .ToListAsync(cancellationToken);
    }

    public async Task<MenuProductDto> CreateMenuProductAsync(CreateMenuProductRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category))
        {
            throw new InvalidOperationException("Nombre y categoría son obligatorios.");
        }
        if (request.Price <= 0)
        {
            throw new InvalidOperationException("El precio debe ser mayor que cero.");
        }

        var entity = new MenuProduct
        {
            Name = request.Name.Trim(),
            Category = request.Category.Trim(),
            Price = decimal.Round(request.Price, 2),
            IsActive = true
        };
        dbContext.MenuProducts.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new MenuProductDto(entity.Id, entity.Name, entity.Category, entity.Price);
    }

    public async Task<MenuProductDto?> UpdateMenuProductPriceAsync(int id, decimal price, CancellationToken cancellationToken)
    {
        if (price <= 0)
        {
            throw new InvalidOperationException("El precio debe ser mayor que cero.");
        }

        var entity = await dbContext.MenuProducts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.Price = decimal.Round(price, 2);
        await dbContext.SaveChangesAsync(cancellationToken);
        return new MenuProductDto(entity.Id, entity.Name, entity.Category, entity.Price);
    }

    public async Task<MenuProductDto?> UpdateMenuProductAsync(int id, UpdateMenuProductRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Category))
        {
            throw new InvalidOperationException("Nombre y categoría son obligatorios.");
        }
        if (request.Price <= 0)
        {
            throw new InvalidOperationException("El precio debe ser mayor que cero.");
        }

        var entity = await dbContext.MenuProducts.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        entity.Name = request.Name.Trim();
        entity.Category = request.Category.Trim();
        entity.Price = decimal.Round(request.Price, 2);

        await dbContext.SaveChangesAsync(cancellationToken);
        return new MenuProductDto(entity.Id, entity.Name, entity.Category, entity.Price);
    }

    public static DateTime GetPeruTime()
    {
        try
        {
            var tz = TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time");
            return TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
        }
        catch
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("America/Lima");
                return TimeZoneInfo.ConvertTime(DateTime.UtcNow, tz);
            }
            catch
            {
                return DateTime.UtcNow.AddHours(-5);
            }
        }
    }

    public async Task<DashboardSummaryDto> GetCurrentMonthDashboardAsync(CancellationToken cancellationToken)
    {
        var now = GetPeruTime();
        var start = new DateTime(now.Year, now.Month, 1);
        var end = start.AddMonths(1);

        var monthDocs = await dbContext.BillingDocuments
            .AsNoTracking()
            .Where(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end)
            .ToListAsync(cancellationToken);

        var revenueByDay = monthDocs
            .GroupBy(x => x.CreatedAtUtc.Day)
            .OrderBy(x => x.Key)
            .Select(x => new RevenueByDayDto(x.Key, decimal.Round(x.Sum(d => d.Total), 2)))
            .ToArray();

        var openOrders = await dbContext.Orders.AsNoTracking().CountAsync(x => x.Status == OrderStatus.Open, cancellationToken);

        return new DashboardSummaryDto(
            now.Year,
            now.Month,
            decimal.Round(monthDocs.Sum(x => x.Total), 2),
            monthDocs.Count,
            openOrders,
            revenueByDay);
    }

    public async Task<byte[]> BuildBillingExcelAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken cancellationToken)
    {
        var (start, end) = ResolveRange(fromUtc, toUtc);

        var rows = await dbContext.BillingDocuments
            .AsNoTracking()
            .Include(x => x.Order!)
            .ThenInclude(o => o!.DiningTable)
            .Where(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end)
            .OrderBy(x => x.CreatedAtUtc)
            .Select(x => new
            {
                x.DocumentNumber,
                Mesa = x.Order!.DiningTable!.Name,
                x.PaymentMethod,
                x.Subtotal,
                x.DiscountAmount,
                x.TaxAmount,
                x.ServiceChargeAmount,
                x.Total,
                x.CreatedAtUtc
            })
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Facturacion");
        ws.Cell(1, 1).Value = "Documento";
        ws.Cell(1, 2).Value = "Mesa";
        ws.Cell(1, 3).Value = "Pago";
        ws.Cell(1, 4).Value = "Subtotal";
        ws.Cell(1, 5).Value = "Descuento";
        ws.Cell(1, 6).Value = "IGV Incluido";
        ws.Cell(1, 7).Value = "Recargo";
        ws.Cell(1, 8).Value = "Total";
        ws.Cell(1, 9).Value = "Fecha UTC";

        for (var i = 0; i < rows.Count; i++)
        {
            var row = i + 2;
            ws.Cell(row, 1).Value = rows[i].DocumentNumber;
            ws.Cell(row, 2).Value = rows[i].Mesa;
            ws.Cell(row, 3).Value = rows[i].PaymentMethod.ToString();
            ws.Cell(row, 4).Value = rows[i].Subtotal;
            ws.Cell(row, 5).Value = rows[i].DiscountAmount;
            ws.Cell(row, 6).Value = rows[i].TaxAmount;
            ws.Cell(row, 7).Value = rows[i].ServiceChargeAmount;
            ws.Cell(row, 8).Value = rows[i].Total;
            ws.Cell(row, 9).Value = rows[i].CreatedAtUtc;
        }

        ws.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<byte[]> BuildProductDetailExcelAsync(DateTime? fromUtc, DateTime? toUtc, CancellationToken cancellationToken)
    {
        var (start, end) = ResolveRange(fromUtc, toUtc);

        var rows = await dbContext.BillingDocuments
            .AsNoTracking()
            .Include(x => x.Order!)
            .ThenInclude(o => o!.DiningTable)
            .Include(x => x.Order!)
            .ThenInclude(o => o!.Items)
            .Where(x => x.CreatedAtUtc >= start && x.CreatedAtUtc < end)
            .OrderBy(x => x.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("DetalleProductos");
        ws.Cell(1, 1).Value = "Documento";
        ws.Cell(1, 2).Value = "Mesa";
        ws.Cell(1, 3).Value = "Producto";
        ws.Cell(1, 4).Value = "Cantidad";
        ws.Cell(1, 5).Value = "Precio Unitario";
        ws.Cell(1, 6).Value = "Total Línea";
        ws.Cell(1, 7).Value = "Fecha UTC";

        var rowNumber = 2;
        foreach (var bill in rows)
        {
            foreach (var item in bill.Order!.Items)
            {
                ws.Cell(rowNumber, 1).Value = bill.DocumentNumber;
                ws.Cell(rowNumber, 2).Value = bill.Order.DiningTable!.Name;
                ws.Cell(rowNumber, 3).Value = item.Name;
                ws.Cell(rowNumber, 4).Value = item.Quantity;
                ws.Cell(rowNumber, 5).Value = item.UnitPrice;
                ws.Cell(rowNumber, 6).Value = decimal.Round(item.LineTotal, 2);
                ws.Cell(rowNumber, 7).Value = bill.CreatedAtUtc;
                rowNumber++;
            }
        }

        ws.Columns().AdjustToContents();
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<CreateOrderResultDto> CreateOrderAsync(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        if (request.Items is null || request.Items.Count == 0)
        {
            throw new InvalidOperationException("Debes seleccionar al menos un producto para generar la orden.");
        }

        var table = await dbContext.DiningTables
            .FirstOrDefaultAsync(x => x.Id == request.TableId && x.IsActive, cancellationToken)
            ?? throw new InvalidOperationException("La mesa seleccionada no existe o no está activa.");

        var existingOpenOrder = await dbContext.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.DiningTableId == request.TableId && x.Status == OrderStatus.Open, cancellationToken);

        if (existingOpenOrder is not null)
        {
            throw new InvalidOperationException($"La mesa ya tiene una orden abierta (#{existingOpenOrder.Id}).");
        }

        var productIds = request.Items.Select(x => x.ProductId).Distinct().ToArray();
        var products = await dbContext.MenuProducts
            .Where(x => productIds.Contains(x.Id) && x.IsActive)
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        if (products.Count != productIds.Length)
        {
            throw new InvalidOperationException("Uno o más productos no son válidos o no están activos.");
        }

        var order = new Order
        {
            DiningTableId = table.Id,
            Status = OrderStatus.Open,
            OpenedAtUtc = GetPeruTime()
        };

        foreach (var requestedItem in request.Items)
        {
            if (requestedItem.Quantity <= 0)
            {
                throw new InvalidOperationException("La cantidad de cada producto debe ser mayor que cero.");
            }

            var product = products[requestedItem.ProductId];
            order.Items.Add(new OrderItem
            {
                Name = product.Name,
                Quantity = decimal.Round(requestedItem.Quantity, 2),
                UnitPrice = product.Price
            });
        }

        dbContext.Orders.Add(order);
        await dbContext.SaveChangesAsync(cancellationToken);

        var subtotal = decimal.Round(order.Items.Sum(x => x.LineTotal), 2);
        return new CreateOrderResultDto(order.Id, table.Id, table.Name, subtotal, order.Items.Count);
    }

    public async Task<IReadOnlyCollection<OpenOrderSummaryDto>> GetOpenOrdersAsync(CancellationToken cancellationToken)
    {
        return await dbContext.Orders
            .AsNoTracking()
            .Where(o => o.Status == OrderStatus.Open)
            .Select(o => new OpenOrderSummaryDto(
                o.Id,
                o.DiningTableId,
                o.DiningTable!.Name,
                o.OpenedAtUtc,
                o.Items.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<PrebillResultDto?> BuildPrebillAsync(
        int orderId,
        string? discountCode,
        PaymentMethod paymentMethod,
        CancellationToken cancellationToken)
    {
        var order = await dbContext.Orders
            .AsNoTracking()
            .Include(x => x.DiningTable)
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == orderId, cancellationToken);

        if (order is null)
        {
            return null;
        }

        if (order.Status == OrderStatus.Closed)
        {
            throw new InvalidOperationException("La orden ya fue cerrada.");
        }

        var discount = await ResolveDiscountAsync(discountCode, cancellationToken);
        var calc = CalculateTotals(order.Items, discount, paymentMethod);

        return new PrebillResultDto(
            order.Id,
            order.DiningTable?.Name ?? "Mesa desconocida",
            discount?.Code,
            paymentMethod.ToString(),
            calc.Subtotal,
            calc.DiscountAmount,
            calc.TaxAmount,
            calc.ServiceChargeAmount,
            calc.Total,
            order.Items.Select(i => new PrebillItemDto(i.Name, i.Quantity, i.UnitPrice, decimal.Round(i.LineTotal, 2))).ToArray());
    }

    public async Task<CloseOrderResultDto?> CloseOrderAsync(
        int orderId,
        string? discountCode,
        PaymentMethod paymentMethod,
        CancellationToken cancellationToken)
    {
        await using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        var order = await dbContext.Orders
            .Include(x => x.Items)
            .Include(x => x.BillingDocument)
            .FirstOrDefaultAsync(x => x.Id == orderId, cancellationToken);

        if (order is null)
        {
            return null;
        }

        if (order.Status == OrderStatus.Closed && order.BillingDocument is not null)
        {
            return new CloseOrderResultDto(
                order.Id,
                order.BillingDocument.DocumentNumber,
                order.BillingDocument.PaymentMethod.ToString(),
                order.ClosedAtUtc ?? order.BillingDocument.CreatedAtUtc,
                order.BillingDocument.Total);
        }

        var discount = await ResolveDiscountAsync(discountCode, cancellationToken);
        var calc = CalculateTotals(order.Items, discount, paymentMethod);

        var document = new BillingDocument
        {
            OrderId = order.Id,
            DocumentNumber = $"F{GetPeruTime():yyMMddHHmmss}-{order.Id}",
            PaymentMethod = paymentMethod,
            Subtotal = calc.Subtotal,
            DiscountAmount = calc.DiscountAmount,
            TaxAmount = calc.TaxAmount,
            ServiceChargeAmount = calc.ServiceChargeAmount,
            Total = calc.Total,
            CreatedAtUtc = GetPeruTime()
        };

        dbContext.BillingDocuments.Add(document);
        order.Status = OrderStatus.Closed;
        order.ClosedAtUtc = GetPeruTime();

        await dbContext.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return new CloseOrderResultDto(
            order.Id,
            document.DocumentNumber,
            paymentMethod.ToString(),
            order.ClosedAtUtc.Value,
            document.Total);
    }

    private async Task<DiscountRule?> ResolveDiscountAsync(string? discountCode, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(discountCode))
        {
            return null;
        }

        var normalized = discountCode.Trim().ToUpperInvariant();

        var discount = await dbContext.DiscountRules
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Code == normalized && x.IsActive, cancellationToken);

        if (discount is null)
        {
            throw new InvalidOperationException($"No existe un descuento activo con código '{normalized}'.");
        }

        return discount;
    }

    private static (decimal Subtotal, decimal DiscountAmount, decimal TaxAmount, decimal ServiceChargeAmount, decimal Total) CalculateTotals(
        IEnumerable<OrderItem> items,
        DiscountRule? discount,
        PaymentMethod paymentMethod)
    {
        var subtotal = decimal.Round(items.Sum(x => x.LineTotal), 2);
        var discountAmount = discount is null ? 0m : discount.DiscountType switch
        {
            DiscountType.Percentage => decimal.Round(subtotal * (discount.Value / 100m), 2),
            DiscountType.FixedAmount => decimal.Round(discount.Value, 2),
            _ => 0m
        };

        discountAmount = Math.Min(discountAmount, subtotal);
        var discountedSubtotal = subtotal - discountAmount;
        var taxAmount = decimal.Round(discountedSubtotal * (IncludedTaxRate / (1m + IncludedTaxRate)), 2);
        var surchargeRate = paymentMethod is PaymentMethod.Cash ? 0m : CardTransferSurchargeRate;
        var serviceChargeAmount = decimal.Round(discountedSubtotal * surchargeRate, 2);
        var total = decimal.Round(discountedSubtotal + serviceChargeAmount, 2);

        return (subtotal, discountAmount, taxAmount, serviceChargeAmount, total);
    }

    private static (DateTime Start, DateTime End) ResolveRange(DateTime? fromUtc, DateTime? toUtc)
    {
        if (fromUtc.HasValue && toUtc.HasValue)
        {
            var start = fromUtc.Value.Date;
            var end = toUtc.Value.Date.AddDays(1);
            if (start >= end)
            {
                throw new InvalidOperationException("El rango de fechas es inválido.");
            }
            return (start, end);
        }

        var now = GetPeruTime();
        var monthStart = new DateTime(now.Year, now.Month, 1);
        return (monthStart, monthStart.AddMonths(1));
    }
}
