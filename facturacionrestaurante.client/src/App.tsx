import { NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import './App.css';

type PaymentMethod = 'Cash' | 'Card' | 'Transfer';

interface OpenOrder {
  orderId: number;
  tableId: number;
  tableName: string;
  openedAtUtc: string;
  itemCount: number;
}

interface TableStatus {
  tableId: number;
  tableName: string;
  isActive: boolean;
  openOrderId?: number;
}

interface MenuProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
}

interface DashboardSummary {
  year: number;
  month: number;
  revenueMonth: number;
  ticketsIssued: number;
  openOrders: number;
  revenueByDay: { day: number; totalRevenue: number }[];
}

interface PrebillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface PrebillResult {
  orderId: number;
  tableName: string;
  appliedDiscountCode?: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  items: PrebillItem[];
}

interface CloseOrderResult {
  orderId: number;
  documentNumber: string;
  paymentMethod: PaymentMethod;
  closedAtUtc: string;
  total: number;
}

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>RestoApp</h1>
        <nav>
          <NavItem to="/">Inicio</NavItem>
          <NavItem to="/mesas">Mesas</NavItem>
          <NavItem to="/pedidos">Pedidos</NavItem>
          <NavItem to="/productos">Productos</NavItem>
          <NavItem to="/reportes">Reportes</NavItem>
          <NavItem to="/configuracion">Configuración</NavItem>
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<InicioPage />} />
          <Route path="/mesas" element={<MesasPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/productos" element={<InfoPage title="Productos" text="Catálogo, precios y disponibilidad." />} />
          <Route path="/reportes" element={<InformesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="*" element={<InfoPage title="No encontrado" text="La ruta no existe." />} />
        </Routes>
      </main>
    </div>
  );
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  }

  const text = await response.text();
  if (text.includes('<!doctype') || text.includes('<html')) {
    return `${fallback} (la API no respondió JSON; verifica backend y proxy).`;
  }

  return text || fallback;
}

async function fetchWithRetry(url: string, options?: RequestInit, retries = 5): Promise<Response> {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      // If it's OK or a client error (4xx), return immediately. 
      // 5xx errors (like 502/504 from Vite proxy) will cause a retry.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res;
      }
    } catch (e) {
      lastError = e;
    }
    // Wait before retrying (exponential backoff or fixed 2s)
    await new Promise(r => setTimeout(r, 2000));
  }
  return fetch(url, options);
}

function getCategoryImage(category: string): string {
  const categoryKey = category.trim().toLowerCase();
  const map: Record<string, string> = {
    pollo: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=320&q=80',
    especialidades: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=320&q=80',
    entradas: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=320&q=80',
    ensaladas: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=320&q=80',
    guarniciones: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=320&q=80',
    postres: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=320&q=80',
    bebidas: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=320&q=80'
  };
  return map[categoryKey] ?? 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=320&q=80';
}

function InicioPage() {
  const [data, setData] = useState<DashboardSummary>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const response = await fetchWithRetry('/api/billing/dashboard/monthly');
    if (!response.ok) {
      setError(await readErrorMessage(response, 'No se pudo cargar el dashboard.'));
      setLoading(false);
      return;
    }
    setData((await response.json()) as DashboardSummary);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const max = Math.max(...(data?.revenueByDay.map((x) => x.totalRevenue) ?? [1]));

  return (
    <section>
      <header className="title-row">
        <h2>Inicio - Rendimiento del Mes</h2>
        <p>Seguimiento de ingresos, tickets emitidos y órdenes abiertas.</p>
      </header>
      {loading && <p>Cargando dashboard...</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <div className="kpi-grid">
            <article className="panel"><h3>Ingresos del Mes</h3><p className="kpi">S/ {data.revenueMonth.toFixed(2)}</p></article>
            <article className="panel"><h3>Tickets Emitidos</h3><p className="kpi">{data.ticketsIssued}</p></article>
            <article className="panel"><h3>Órdenes Abiertas</h3><p className="kpi">{data.openOrders}</p></article>
          </div>
          <section className="panel">
            <h3>Gráfico de ventas por día</h3>
            <div className="bar-chart">
              {data.revenueByDay.length === 0 && <p>Aún no hay tickets cerrados este mes.</p>}
              {data.revenueByDay.map((point) => (
                <div key={point.day} className="bar-item">
                  <div className="bar-label">Día {point.day}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(point.totalRevenue / max) * 100}%` }} />
                  </div>
                  <div className="bar-value">S/ {point.totalRevenue.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
      {children}
    </NavLink>
  );
}

function InfoPage({ title, text }: { title: string; text: string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>{text}</p>
      <p></p>
    </section>
  );
}

function MesasPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number>();
  const [discountCode, setDiscountCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [prebill, setPrebill] = useState<PrebillResult>();
  const [closeResult, setCloseResult] = useState<CloseOrderResult>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [activeTable, setActiveTable] = useState<number>(1);

  const loadTables = useCallback(async () => {
    const response = await fetchWithRetry('/api/billing/tables');
    if (!response.ok) {
      setError('No se pudo consultar las mesas.');
      return;
    }
    const data = (await response.json()) as TableStatus[];
    setTables(data);
    if (data.length > 0) {
      setActiveTable((current) => current || data[0].tableId);
    }
  }, []);

  const loadOpenOrders = useCallback(async () => {
    setError(undefined);
    const response = await fetchWithRetry('/api/billing/orders/open');
    if (!response.ok) {
      setError('No se pudo consultar el listado de órdenes abiertas.');
      return;
    }

    const data = (await response.json()) as OpenOrder[];
    setOrders(data);
    if (data.length > 0) {
      setSelectedOrderId(data[0].orderId);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoadingInitial(true);
    await Promise.all([loadTables(), loadOpenOrders()]);
    setLoadingInitial(false);
  }, [loadTables, loadOpenOrders]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handlePreview() {
    if (!selectedOrderId) {
      setError('Selecciona una orden para generar la precuenta.');
      return;
    }

    setLoading(true);
    setError(undefined);
    setCloseResult(undefined);

    const qs = new URLSearchParams({
      paymentMethod,
      discountCode
    });

    const response = await fetch(`/api/billing/orders/${selectedOrderId}/prebill?${qs.toString()}`);
    setLoading(false);

    if (!response.ok) {
      const message = await readErrorMessage(response, 'Error al generar la precuenta.');
      setError(message);
      return;
    }

    setPrebill((await response.json()) as PrebillResult);
  }

  async function handleCloseOrder() {
    if (!selectedOrderId) {
      setError('Selecciona una orden para cerrar mesa.');
      return;
    }

    setLoading(true);
    setError(undefined);
    const response = await fetch(`/api/billing/orders/${selectedOrderId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discountCode,
        paymentMethod
      })
    });
    setLoading(false);

    if (!response.ok) {
      const message = await readErrorMessage(response, 'Error al cerrar la mesa.');
      setError(message);
      return;
    }

    setCloseResult((await response.json()) as CloseOrderResult);
    setPrebill(undefined);
    await loadData();
  }

  function handlePrintTicket() {
    if (!prebill) {
      setError('Primero genera una precuenta para imprimir ticket.');
      return;
    }

    const doc = new jsPDF({ format: 'a4' });
    const blue = [11, 49, 130] as const;
    const docNumber = closeResult?.documentNumber ?? `PREF-${prebill.orderId}`;

    doc.setDrawColor(...blue);
    doc.setTextColor(...blue);
    doc.setLineWidth(0.4);

    doc.rect(12, 12, 90, 30);
    doc.setFontSize(14);
    doc.text('RESTOAPP S.A.C.', 18, 22);
    doc.setFontSize(8);
    doc.text('Av. Principal 123, Lima - Peru', 18, 28);
    doc.text('Atencion: Mesa / Salon', 18, 33);

    doc.rect(110, 12, 88, 30);
    doc.setFontSize(11);
    doc.text('RUC: 20334461875', 125, 20);
    doc.setFontSize(15);
    doc.text('BOLETA DE VENTA', 123, 28);
    doc.text('ELECTRONICA', 125, 35);
    doc.setFontSize(11);
    doc.text(`Nro. ${docNumber}`, 128, 41);

    doc.rect(12, 48, 186, 26);
    doc.setFontSize(9);
    doc.text(`Cliente: Cliente General`, 16, 56);
    doc.text(`Direccion: ----`, 16, 62);
    doc.text(`Fecha de Emision: ${new Date().toLocaleDateString()}`, 16, 68);
    doc.text(`Mesa: ${prebill.tableName}`, 110, 56);
    doc.text(`Orden: #${prebill.orderId}`, 110, 62);
    doc.text(`Moneda: SOLES`, 110, 68);

    doc.rect(12, 80, 186, 10);
    doc.text('DESCRIPCION', 16, 86);
    doc.text('CANT.', 106, 86);
    doc.text('P.UNIT', 130, 86);
    doc.text('TOTAL', 168, 86);

    let y = 96;
    prebill.items.forEach((item) => {
      doc.text(item.name.slice(0, 44), 16, y);
      doc.text(item.quantity.toFixed(2), 108, y, { align: 'right' });
      doc.text(item.unitPrice.toFixed(2), 145, y, { align: 'right' });
      doc.text(item.lineTotal.toFixed(2), 188, y, { align: 'right' });
      y += 7;
    });

    y += 4;
    doc.rect(120, y - 4, 78, 40);
    doc.text(`Subtotal: S/ ${prebill.subtotal.toFixed(2)}`, 124, y + 2);
    doc.text(`Descuento: S/ ${prebill.discountAmount.toFixed(2)}`, 124, y + 8);
    doc.text(`IGV incluido: S/ ${prebill.taxAmount.toFixed(2)}`, 124, y + 14);
    doc.text(`Recargo: S/ ${prebill.serviceChargeAmount.toFixed(2)}`, 124, y + 20);
    doc.setFontSize(11);
    doc.text(`IMPORTE TOTAL: S/ ${prebill.total.toFixed(2)}`, 124, y + 30);
    doc.save(`ticket-orden-${prebill.orderId}.pdf`);
  }

  const statusByTable = useMemo(() => {
    return new Map<number, 'Libre' | 'Ocupada' | 'Precuenta'>(
      tables.map((table) => {
        const hasOpen = Boolean(table.openOrderId);
        const hasPrebill =
          hasOpen &&
          prebill &&
          orders.find((o) => o.orderId === prebill.orderId)?.tableId === table.tableId;
        return [table.tableId, hasPrebill ? 'Precuenta' : hasOpen ? 'Ocupada' : 'Libre'];
      })
    );
  }, [tables, prebill, orders]);

  return (
    <section>
      <header className="title-row">
        <h2>Mesas</h2>
        <p>Vista operativa para pedido, precuenta y cierre.</p>
      </header>
      {loadingInitial && <p>Cargando mesas y órdenes...</p>}

      <div className="three-cols">
        <section className="panel mesas-grid">
          {tables.map((table) => (
            <button
              key={table.tableId}
              className={`mesa-card ${activeTable === table.tableId ? 'selected' : ''}`}
              onClick={() => {
                setActiveTable(table.tableId);
                if (!table.openOrderId) {
                  navigate(`/pedidos?tableId=${table.tableId}`);
                } else {
                  setSelectedOrderId(table.openOrderId);
                }
              }}
            >
              <span className="mesa-name">{table.tableName}</span>
              <span className={`mesa-status status-${statusByTable.get(table.tableId)?.toLowerCase()}`}>
                {statusByTable.get(table.tableId)}
              </span>
            </button>
          ))}
        </section>

        <section className="panel">
          <h3>Pedido activo</h3>
          <label>
            Orden abierta
            <select
              value={selectedOrderId ?? ''}
              onChange={(e) => setSelectedOrderId(Number(e.target.value))}
            >
              <option value="" disabled>
                Selecciona una orden
              </option>
              {orders.map((order) => (
                <option key={order.orderId} value={order.orderId}>
                  #{order.orderId} - {order.tableName} ({order.itemCount} items)
                </option>
              ))}
            </select>
          </label>
          <label>
            Código de descuento
            <input
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              placeholder="VIP10 o PROMO5"
            />
          </label>
          <label>
            Método de pago
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              <option value="Cash">Efectivo</option>
              <option value="Card">Tarjeta</option>
              <option value="Transfer">Transferencia</option>
            </select>
          </label>
          <button onClick={handlePreview} disabled={loading}>
            {loading ? 'Calculando...' : 'Generar Precuenta'}
          </button>
        </section>

        <section className="panel">
          <h3>Detalle del pedido</h3>
          {!prebill && <p>Genera una precuenta para visualizar el detalle.</p>}
          {prebill && (
            <>
              <ul className="items-list">
                {prebill.items.map((item) => (
                  <li key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.quantity} x S/ {item.unitPrice.toFixed(2)}</span>
                    <span>S/ {item.lineTotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="totals">
                <p><span>Subtotal</span><span>S/ {prebill.subtotal.toFixed(2)}</span></p>
                <p><span>Descuento</span><span>- S/ {prebill.discountAmount.toFixed(2)}</span></p>
                <p><span>IGV incluido (18%)</span><span>S/ {prebill.taxAmount.toFixed(2)}</span></p>
                <p><span>Recargo medio pago (0% efectivo / 5% tarjeta-transferencia)</span><span>S/ {prebill.serviceChargeAmount.toFixed(2)}</span></p>
                <p className="grand-total"><span>TOTAL</span><span>S/ {prebill.total.toFixed(2)}</span></p>
              </div>
              <button onClick={handleCloseOrder} disabled={loading}>
                {loading ? 'Procesando...' : 'Cerrar y Pagar'}
              </button>
              <button onClick={handlePrintTicket} disabled={loading}>
                Imprimir Ticket (PDF)
              </button>
            </>
          )}
          {error && <p className="error">{error}</p>}
          {closeResult && (
            <p className="success-note">
              Documento {closeResult.documentNumber} emitido. Total: S/ {closeResult.total.toFixed(2)}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}

function InformesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  async function downloadExcel(endpoint: 'excel' | 'products-excel', filePrefix: string) {
    setLoading(true);
    setMessage(undefined);
    setError(undefined);
    const qs = new URLSearchParams({ from, to });
    const response = await fetch(`/api/billing/reports/${endpoint}?${qs.toString()}`);
    setLoading(false);
    if (!response.ok) {
      setError(await readErrorMessage(response, 'No se pudo descargar el Excel.'));
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${filePrefix}-${from}-a-${to}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage('Excel descargado correctamente.');
  }

  return (
    <section>
      <header className="title-row">
        <h2>Informes</h2>
        <p>Exporta la base por rango de fechas, incluyendo detalle por producto.</p>
      </header>
      <section className="panel">
        <div className="report-filters">
          <label>Desde<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>Hasta<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
        <div className="report-actions">
          <button onClick={() => downloadExcel('excel', 'reporte-facturacion')} disabled={loading}>
            {loading ? 'Generando...' : 'Descargar Base General'}
          </button>
          <button onClick={() => downloadExcel('products-excel', 'reporte-productos')} disabled={loading}>
            {loading ? 'Generando...' : 'Descargar Detalle Productos'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p className="success-note">{message}</p>}
      </section>
    </section>
  );
}

function ConfiguracionPage() {
  const [menu, setMenu] = useState<MenuProduct[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    const response = await fetchWithRetry('/api/billing/menu');
    if (!response.ok) {
      setError(await readErrorMessage(response, 'No se pudo cargar productos.'));
      setLoading(false);
      return;
    }
    setMenu((await response.json()) as MenuProduct[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  async function updatePrice(id: number, newPrice: number) {
    const response = await fetch(`/api/billing/menu/${id}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: newPrice })
    });
    if (!response.ok) {
      setError(await readErrorMessage(response, 'No se pudo actualizar precio.'));
      return;
    }
    setMessage('Precio actualizado.');
    await loadMenu();
  }

  async function addProduct() {
    setError(undefined);
    setMessage(undefined);
    const numericPrice = Number(price);
    const response = await fetch('/api/billing/menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, category, price: numericPrice })
    });
    if (!response.ok) {
      setError(await readErrorMessage(response, 'No se pudo crear producto.'));
      return;
    }
    setName('');
    setCategory('');
    setPrice('');
    setMessage('Producto agregado correctamente.');
    await loadMenu();
  }

  return (
    <section>
      <header className="title-row">
        <h2>Configuración</h2>
        <p>Modifica precios y agrega nuevos productos/pedidos de la carta.</p>
      </header>
      {loading && <p>Cargando configuración...</p>}
      <div className="two-cols">
        <section className="panel">
          <h3>Agregar producto</h3>
          <label>Nombre<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Categoría<input value={category} onChange={(e) => setCategory(e.target.value)} /></label>
          <label>Precio<input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" /></label>
          <button onClick={addProduct}>Agregar</button>
        </section>
        <section className="panel">
          <h3>Editar precios</h3>
          <ul className="items-list">
            {menu.map((item) => (
              <li key={item.id}>
                <span>{item.name}</span>
                <span>{item.category}</span>
                <span>
                  <input
                    type="number"
                    step="0.01"
                    defaultValue={item.price}
                    onBlur={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isNaN(value) && value > 0 && value !== item.price) {
                        void updatePrice(item.id, value);
                      }
                    }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success-note">{message}</p>}
    </section>
  );
}

function PedidosPage() {
  const [searchParams] = useSearchParams();
  const [tables, setTables] = useState<TableStatus[]>([]);
  const [menu, setMenu] = useState<MenuProduct[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number>();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loadingInitial, setLoadingInitial] = useState(true);

  const loadData = useCallback(async () => {
    setLoadingInitial(true);
    const [tablesRes, menuRes] = await Promise.all([
      fetchWithRetry('/api/billing/tables'),
      fetchWithRetry('/api/billing/menu')
    ]);

    if (!tablesRes.ok || !menuRes.ok) {
      setError('No se pudo cargar mesas o carta.');
      setLoadingInitial(false);
      return;
    }

    const tablesData = (await tablesRes.json()) as TableStatus[];
    const menuData = (await menuRes.json()) as MenuProduct[];
    const withImages = menuData.map((item) => ({
      ...item,
      imageUrl: getCategoryImage(item.category)
    }));
    setTables(tablesData);
    setMenu(withImages);

    const tableFromQuery = Number(searchParams.get('tableId'));
    if (
      Number.isFinite(tableFromQuery) &&
      tableFromQuery > 0 &&
      tablesData.some((t) => t.tableId === tableFromQuery && !t.openOrderId)
    ) {
      setSelectedTableId(tableFromQuery);
      return;
    }

    const freeTable = tablesData.find((t) => !t.openOrderId);
    if (freeTable) {
      setSelectedTableId(freeTable.tableId);
    }
    setLoadingInitial(false);
  }, [searchParams]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function addToCart(product: MenuProduct) {
    setCart((current) => {
      const existing = current.find((x) => x.productId === product.id);
      if (existing) {
        return current.map((x) =>
          x.productId === product.id ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      return [...current, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  }

  function updateQty(productId: number, delta: number) {
    setCart((current) =>
      current
        .map((x) => (x.productId === productId ? { ...x, quantity: x.quantity + delta } : x))
        .filter((x) => x.quantity > 0)
    );
  }

  async function createOrder() {
    setError(undefined);
    setSuccess(undefined);
    if (!selectedTableId) {
      setError('Selecciona una mesa.');
      return;
    }
    if (cart.length === 0) {
      setError('Agrega productos de la carta para crear la orden.');
      return;
    }

    const response = await fetch('/api/billing/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tableId: selectedTableId,
        items: cart.map((x) => ({ productId: x.productId, quantity: x.quantity }))
      })
    });

    if (!response.ok) {
      const message = await readErrorMessage(response, 'No se pudo crear la orden.');
      setError(message);
      return;
    }

    const order = (await response.json()) as { orderId: number; tableName: string };
    setSuccess(`Orden #${order.orderId} creada para ${order.tableName}. Ya puedes verla en Mesas.`);
    setCart([]);
    await loadData();
  }

  const grouped = useMemo(() => {
    return menu.reduce<Record<string, MenuProduct[]>>((acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    }, {});
  }, [menu]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <section>
      <header className="title-row">
        <h2>Generar Orden</h2>
        <p>Carta enlazada a mesas. Crea órdenes y luego continúa en Mesas para precuenta/cierre.</p>
      </header>
      {loadingInitial && <p>Cargando carta y mesas...</p>}
      <div className="two-cols">
        <section className="panel">
          <label>
            Mesa destino
            <select value={selectedTableId ?? ''} onChange={(e) => setSelectedTableId(Number(e.target.value))}>
              <option value="" disabled>Selecciona mesa</option>
              {tables.map((t) => (
                <option key={t.tableId} value={t.tableId} disabled={Boolean(t.openOrderId)}>
                  {t.tableName} {t.openOrderId ? '(ocupada)' : '(libre)'}
                </option>
              ))}
            </select>
          </label>
          <div className="menu-groups">
            {Object.entries(grouped).map(([category, products]) => (
              <div key={category} className="menu-group">
                <h3>{category}</h3>
                {products.map((p) => (
                  <button key={p.id} className="menu-item-btn" onClick={() => addToCart(p)}>
                    <img src={p.imageUrl} alt={p.name} loading="lazy" />
                    <span>{p.name}</span>
                    <span>S/ {p.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Orden en construcción</h3>
          {cart.length === 0 && <p>Sin productos agregados.</p>}
          {cart.length > 0 && (
            <ul className="items-list">
              {cart.map((item) => (
                <li key={item.productId}>
                  <span>{item.name}</span>
                  <span>
                    <button type="button" className="qty-btn" onClick={() => updateQty(item.productId, -1)}>-</button>
                    {item.quantity}
                    <button type="button" className="qty-btn" onClick={() => updateQty(item.productId, 1)}>+</button>
                  </span>
                  <span>S/ {(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="grand-total"><span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span></p>
          <button onClick={createOrder}>Crear Orden</button>
          {error && <p className="error">{error}</p>}
          {success && <p className="success-note">{success}</p>}
        </section>
      </div>
    </section>
  );
}

export default App;