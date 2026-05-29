using Microsoft.EntityFrameworkCore;

namespace FacturacionRestaurante.Server;

public class BillingDbContext(DbContextOptions<BillingDbContext> options) : DbContext(options)
{
    public DbSet<DiningTable> DiningTables => Set<DiningTable>();
    public DbSet<MenuProduct> MenuProducts => Set<MenuProduct>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<DiscountRule> DiscountRules => Set<DiscountRule>();
    public DbSet<BillingDocument> BillingDocuments => Set<BillingDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrderItem>()
            .Property(x => x.UnitPrice)
            .HasPrecision(18, 2);

        modelBuilder.Entity<OrderItem>()
            .Property(x => x.Quantity)
            .HasPrecision(18, 2);

        modelBuilder.Entity<MenuProduct>()
            .Property(x => x.Price)
            .HasPrecision(18, 2);

        modelBuilder.Entity<DiscountRule>()
            .HasIndex(x => x.Code)
            .IsUnique();

        modelBuilder.Entity<DiscountRule>()
            .Property(x => x.Value)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BillingDocument>()
            .HasIndex(x => x.DocumentNumber)
            .IsUnique();

        modelBuilder.Entity<BillingDocument>()
            .Property(x => x.Subtotal)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BillingDocument>()
            .Property(x => x.DiscountAmount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BillingDocument>()
            .Property(x => x.TaxAmount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BillingDocument>()
            .Property(x => x.ServiceChargeAmount)
            .HasPrecision(18, 2);

        modelBuilder.Entity<BillingDocument>()
            .Property(x => x.Total)
            .HasPrecision(18, 2);

        modelBuilder.Entity<Order>()
            .HasOne(x => x.BillingDocument)
            .WithOne(x => x.Order)
            .HasForeignKey<BillingDocument>(x => x.OrderId);

        modelBuilder.Entity<DiningTable>().HasData(
            new DiningTable { Id = 1, Name = "Mesa 1", IsActive = true },
            new DiningTable { Id = 2, Name = "Mesa 2", IsActive = true },
            new DiningTable { Id = 3, Name = "Mesa 3", IsActive = true },
            new DiningTable { Id = 4, Name = "Mesa 4", IsActive = true },
            new DiningTable { Id = 5, Name = "Mesa 5", IsActive = true },
            new DiningTable { Id = 6, Name = "Mesa 6", IsActive = true },
            new DiningTable { Id = 7, Name = "Mesa 7", IsActive = true },
            new DiningTable { Id = 8, Name = "Mesa 8", IsActive = true },
            new DiningTable { Id = 9, Name = "Mesa 9", IsActive = true });

        modelBuilder.Entity<MenuProduct>().HasData(
            new MenuProduct { Id = 1, Name = "Pollo a la Brasa", Category = "Pollo", Price = 72.90m, IsActive = true },
            new MenuProduct { Id = 2, Name = "1/2 Pollo con Papas", Category = "Pollo", Price = 48.90m, IsActive = true },
            new MenuProduct { Id = 3, Name = "1/4 Pollo con Papas", Category = "Pollo", Price = 30.90m, IsActive = true },
            new MenuProduct { Id = 4, Name = "Parrilla Don Tito", Category = "Especialidades", Price = 131.90m, IsActive = true },
            new MenuProduct { Id = 5, Name = "Lomo Fino", Category = "Especialidades", Price = 59.90m, IsActive = true },
            new MenuProduct { Id = 6, Name = "Pechuga al Oregano", Category = "Especialidades", Price = 33.90m, IsActive = true },
            new MenuProduct { Id = 7, Name = "Tequenos Don Tito", Category = "Entradas", Price = 18.90m, IsActive = true },
            new MenuProduct { Id = 8, Name = "Brochetas de Lomo", Category = "Entradas", Price = 42.90m, IsActive = true },
            new MenuProduct { Id = 9, Name = "Ensalada Ranchera", Category = "Ensaladas", Price = 29.90m, IsActive = true },
            new MenuProduct { Id = 10, Name = "Papas Fritas", Category = "Guarniciones", Price = 16.90m, IsActive = true },
            new MenuProduct { Id = 11, Name = "Torta de Chocolate", Category = "Postres", Price = 15.90m, IsActive = true },
            new MenuProduct { Id = 12, Name = "Vaso de Chicha", Category = "Bebidas", Price = 7.90m, IsActive = true });

        modelBuilder.Entity<DiscountRule>().HasData(
            new DiscountRule { Id = 1, Code = "VIP10", Description = "Cliente frecuente 10%", DiscountType = DiscountType.Percentage, Value = 10m, IsActive = true },
            new DiscountRule { Id = 2, Code = "PROMO5", Description = "Descuento fijo S/ 5.00", DiscountType = DiscountType.FixedAmount, Value = 5m, IsActive = true });
    }
}
