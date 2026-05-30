import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import type { CartItem, MenuProduct, TableStatus } from '../types';
import { fetchWithRetry, getCategoryImage, readErrorMessage } from '../utils/api';

export function PedidosPage() {
  const [searchParams] = useSearchParams();
  const { t } = useApp();
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
        <h2>{t('TitleGenerarOrden')}</h2>
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
export default PedidosPage;
