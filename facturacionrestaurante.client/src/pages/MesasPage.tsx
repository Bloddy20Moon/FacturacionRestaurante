import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { useApp } from '../context/AppContext';
import type { CloseOrderResult, OpenOrder, PaymentMethod, PrebillResult, TableStatus } from '../types';
import { fetchWithRetry, readErrorMessage } from '../utils/api';

export function MesasPage() {
  const navigate = useNavigate();
  const { t } = useApp();
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
        <h2>{t('TitleMesas')}</h2>
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
              maxLength={20}
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
