import { useApp } from '../context/AppContext';

export function ConfiguracionPage() {
  const { t, lang, setLang, theme, setTheme } = useApp();

  return (
    <section>
      <header className="title-row">
        <h2>{t('TitleConfiguracion')}</h2>
        <p>Ajusta las preferencias de apariencia y lenguaje.</p>
      </header>
      <div className="two-cols">
        <section className="panel">
          <h3>{t('Language')}</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className={lang === 'es' ? 'selected' : ''} onClick={() => setLang('es')}>Español</button>
            <button className={lang === 'en' ? 'selected' : ''} onClick={() => setLang('en')}>English</button>
            <button className={lang === 'pt' ? 'selected' : ''} onClick={() => setLang('pt')}>Português</button>
          </div>
        </section>
        <section className="panel">
          <h3>Apariencia</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button className={theme === 'light' ? 'selected' : ''} onClick={() => setTheme('light')}>{t('ThemeLight')}</button>
            <button className={theme === 'dark' ? 'selected' : ''} onClick={() => setTheme('dark')}>{t('ThemeDark')}</button>
          </div>
        </section>
      </div>
    </section>
  );
}
export default ConfiguracionPage;
