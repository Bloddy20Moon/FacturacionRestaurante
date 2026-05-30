import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { readErrorMessage } from '../utils/api';

export function InformesPage() {
  const { t } = useApp();
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
        <h2>{t('TitleInformes')}</h2>
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
export default InformesPage;
