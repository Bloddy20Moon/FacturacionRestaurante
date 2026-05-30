import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { MenuProduct } from '../types';
import { fetchWithRetry, readErrorMessage } from '../utils/api';

export function ProductosConfiguracionPage() {
  const { t } = useApp();
  const [menu, setMenu] = useState<MenuProduct[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
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

  function startEdit(item: MenuProduct) {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    setError(undefined);
    setMessage(undefined);
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setCategory('');
    setPrice('');
    setError(undefined);
  }

  async function saveProduct() {
    setError(undefined);
    setMessage(undefined);
    const numericPrice = Number(price);

    if (!name.trim() || !category.trim()) {
      setError('El nombre y la categoría son obligatorios.');
      return;
    }
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      setError('El precio debe ser un número mayor a cero.');
      return;
    }

    if (editingId !== null) {
      // Modificar / Editar producto existente
      const response = await fetch(`/api/billing/menu/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price: numericPrice })
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, 'No se pudo actualizar el producto.'));
        return;
      }
      setMessage('Producto actualizado correctamente.');
    } else {
      // Agregar nuevo producto
      const response = await fetch('/api/billing/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, price: numericPrice })
      });
      if (!response.ok) {
        setError(await readErrorMessage(response, 'No se pudo crear producto.'));
        return;
      }
      setMessage('Producto agregado correctamente.');
    }

    cancelEdit();
    await loadMenu();
  }

  return (
    <section>
      <header className="title-row">
        <h2>{t('TitleProductos')}</h2>
        <p>Gestiona, agrega y edita los productos de la carta del restaurante.</p>
      </header>
      {loading && <p>Cargando productos...</p>}
      <div className="two-cols">
        <section className="panel">
          <h3>{editingId !== null ? 'Editar producto' : 'Agregar producto'}</h3>
          <label>
            Nombre
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </label>
          <label>
            Categoría
            <input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} />
          </label>
          <label>
            Precio
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={saveProduct}>{editingId !== null ? 'Guardar' : 'Agregar'}</button>
            {editingId !== null && (
              <button onClick={cancelEdit} style={{ background: '#64748b' }}>Cancelar</button>
            )}
          </div>
        </section>
        <section className="panel">
          <h3>Catálogo de Productos</h3>
          <ul className="items-list" style={{ maxHeight: '450px', overflowY: 'auto' }}>
            {menu.map((item) => (
              <li key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 0.8fr auto', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontWeight: '600' }}>{item.name}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.category}</span>
                <span>S/ {item.price.toFixed(2)}</span>
                <button onClick={() => startEdit(item)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: '#f97316', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Editar
                </button>
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
export default ProductosConfiguracionPage;
