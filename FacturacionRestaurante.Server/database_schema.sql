CREATE TABLE [DiningTables] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(40) NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_DiningTables] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [DiscountRules] (
    [Id] int NOT NULL IDENTITY,
    [Code] nvarchar(30) NOT NULL,
    [Description] nvarchar(120) NOT NULL,
    [DiscountType] int NOT NULL,
    [Value] decimal(18,2) NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_DiscountRules] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [MenuProducts] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(120) NOT NULL,
    [Category] nvarchar(60) NOT NULL,
    [Price] decimal(18,2) NOT NULL,
    [IsActive] bit NOT NULL,
    CONSTRAINT [PK_MenuProducts] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Orders] (
    [Id] int NOT NULL IDENTITY,
    [DiningTableId] int NOT NULL,
    [OpenedAtUtc] datetime2 NOT NULL,
    [ClosedAtUtc] datetime2 NULL,
    [Status] int NOT NULL,
    CONSTRAINT [PK_Orders] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Orders_DiningTables_DiningTableId] FOREIGN KEY ([DiningTableId]) REFERENCES [DiningTables] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [BillingDocuments] (
    [Id] int NOT NULL IDENTITY,
    [OrderId] int NOT NULL,
    [DocumentNumber] nvarchar(20) NOT NULL,
    [PaymentMethod] int NOT NULL,
    [Subtotal] decimal(18,2) NOT NULL,
    [DiscountAmount] decimal(18,2) NOT NULL,
    [TaxAmount] decimal(18,2) NOT NULL,
    [ServiceChargeAmount] decimal(18,2) NOT NULL,
    [Total] decimal(18,2) NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_BillingDocuments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BillingDocuments_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE
);
GO


CREATE TABLE [OrderItems] (
    [Id] int NOT NULL IDENTITY,
    [OrderId] int NOT NULL,
    [Name] nvarchar(100) NOT NULL,
    [Quantity] decimal(18,2) NOT NULL,
    [UnitPrice] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_OrderItems] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OrderItems_Orders_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [Orders] ([Id]) ON DELETE CASCADE
);
GO


IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'IsActive', N'Name') AND [object_id] = OBJECT_ID(N'[DiningTables]'))
    SET IDENTITY_INSERT [DiningTables] ON;
INSERT INTO [DiningTables] ([Id], [IsActive], [Name])
VALUES (1, CAST(1 AS bit), N'Mesa 1'),
(2, CAST(1 AS bit), N'Mesa 2'),
(3, CAST(1 AS bit), N'Mesa 3'),
(4, CAST(1 AS bit), N'Mesa 4'),
(5, CAST(1 AS bit), N'Mesa 5'),
(6, CAST(1 AS bit), N'Mesa 6'),
(7, CAST(1 AS bit), N'Mesa 7'),
(8, CAST(1 AS bit), N'Mesa 8'),
(9, CAST(1 AS bit), N'Mesa 9');
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'IsActive', N'Name') AND [object_id] = OBJECT_ID(N'[DiningTables]'))
    SET IDENTITY_INSERT [DiningTables] OFF;
GO


IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Code', N'Description', N'DiscountType', N'IsActive', N'Value') AND [object_id] = OBJECT_ID(N'[DiscountRules]'))
    SET IDENTITY_INSERT [DiscountRules] ON;
INSERT INTO [DiscountRules] ([Id], [Code], [Description], [DiscountType], [IsActive], [Value])
VALUES (1, N'VIP10', N'Cliente frecuente 10%', 1, CAST(1 AS bit), 10.0),
(2, N'PROMO5', N'Descuento fijo S/ 5.00', 2, CAST(1 AS bit), 5.0);
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Code', N'Description', N'DiscountType', N'IsActive', N'Value') AND [object_id] = OBJECT_ID(N'[DiscountRules]'))
    SET IDENTITY_INSERT [DiscountRules] OFF;
GO


IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Category', N'IsActive', N'Name', N'Price') AND [object_id] = OBJECT_ID(N'[MenuProducts]'))
    SET IDENTITY_INSERT [MenuProducts] ON;
INSERT INTO [MenuProducts] ([Id], [Category], [IsActive], [Name], [Price])
VALUES (1, N'Pollo', CAST(1 AS bit), N'Pollo a la Brasa', 72.9),
(2, N'Pollo', CAST(1 AS bit), N'1/2 Pollo con Papas', 48.9),
(3, N'Pollo', CAST(1 AS bit), N'1/4 Pollo con Papas', 30.9),
(4, N'Especialidades', CAST(1 AS bit), N'Parrilla Don Tito', 131.9),
(5, N'Especialidades', CAST(1 AS bit), N'Lomo Fino', 59.9),
(6, N'Especialidades', CAST(1 AS bit), N'Pechuga al Oregano', 33.9),
(7, N'Entradas', CAST(1 AS bit), N'Tequenos Don Tito', 18.9),
(8, N'Entradas', CAST(1 AS bit), N'Brochetas de Lomo', 42.9),
(9, N'Ensaladas', CAST(1 AS bit), N'Ensalada Ranchera', 29.9),
(10, N'Guarniciones', CAST(1 AS bit), N'Papas Fritas', 16.9),
(11, N'Postres', CAST(1 AS bit), N'Torta de Chocolate', 15.9),
(12, N'Bebidas', CAST(1 AS bit), N'Vaso de Chicha', 7.9);
IF EXISTS (SELECT * FROM [sys].[identity_columns] WHERE [name] IN (N'Id', N'Category', N'IsActive', N'Name', N'Price') AND [object_id] = OBJECT_ID(N'[MenuProducts]'))
    SET IDENTITY_INSERT [MenuProducts] OFF;
GO


CREATE UNIQUE INDEX [IX_BillingDocuments_DocumentNumber] ON [BillingDocuments] ([DocumentNumber]);
GO


CREATE UNIQUE INDEX [IX_BillingDocuments_OrderId] ON [BillingDocuments] ([OrderId]);
GO


CREATE UNIQUE INDEX [IX_DiscountRules_Code] ON [DiscountRules] ([Code]);
GO


CREATE INDEX [IX_OrderItems_OrderId] ON [OrderItems] ([OrderId]);
GO


CREATE INDEX [IX_Orders_DiningTableId] ON [Orders] ([DiningTableId]);
GO


