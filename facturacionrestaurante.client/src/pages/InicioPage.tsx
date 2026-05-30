import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { DashboardSummary } from '../types';
import { fetchWithRetry, readErrorMessage } from '../utils/api';

export function InicioPage() {
  const { t } = useApp();
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
        <h2>{t('TitleInicio')}</h2>
        <p>Seguimiento de ingresos, tickets emitidos y órdenes abiertas.</p>
      </header>
      {loading && <p>Cargando dashboard...</p>}
      {error && <p className="error">{error}</p>}
      {data && (
        <>
          <div className="kpi-grid">
            <article className="panel">
              <h3>Ingresos del Mes</h3>
              <p className="kpi">S/ {data.revenueMonth.toFixed(2)}</p>
            </article>
            <article className="panel">
              <h3>Tickets Emitidos</h3>
              <p className="kpi">{data.ticketsIssued}</p>
            </article>
            <article className="panel">
              <h3>Órdenes Abiertas</h3>
              <p className="kpi">{data.openOrders}</p>
            </article>
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
