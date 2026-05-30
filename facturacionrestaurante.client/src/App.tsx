import { NavLink, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { InicioPage } from './pages/InicioPage';
import { MesasPage } from './pages/MesasPage';
import { PedidosPage } from './pages/PedidosPage';
import { ProductosConfiguracionPage } from './pages/ProductosConfiguracionPage';
import { InformesPage } from './pages/InformesPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import './App.css';

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
    </section>
  );
}

function Layout() {
  const { t } = useApp();

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>RestoApp</h1>
        <nav>
          <NavItem to="/">{t('Inicio')}</NavItem>
          <NavItem to="/mesas">{t('Mesas')}</NavItem>
          <NavItem to="/pedidos">{t('Pedidos')}</NavItem>
          <NavItem to="/productos">{t('Productos')}</NavItem>
          <NavItem to="/reportes">{t('Reportes')}</NavItem>
          <NavItem to="/configuracion">{t('Configuracion')}</NavItem>
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<InicioPage />} />
          <Route path="/mesas" element={<MesasPage />} />
          <Route path="/pedidos" element={<PedidosPage />} />
          <Route path="/productos" element={<ProductosConfiguracionPage />} />
          <Route path="/reportes" element={<InformesPage />} />
          <Route path="/configuracion" element={<ConfiguracionPage />} />
          <Route path="*" element={<InfoPage title={t('NotFound')} text="La ruta no existe." />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
}

export default App;