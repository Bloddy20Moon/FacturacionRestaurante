import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'es' | 'en' | 'pt';

export const translations = {
  es: {
    Inicio: 'Inicio',
    Mesas: 'Mesas',
    Pedidos: 'Pedidos',
    Productos: 'Productos',
    Reportes: 'Reportes',
    Configuracion: 'Configuración',
    TitleInicio: 'Inicio - Rendimiento del Mes',
    TitleMesas: 'Mesas',
    TitleInformes: 'Informes',
    TitleGenerarOrden: 'Generar Orden',
    TitleConfiguracion: 'Configuración',
    TitleProductos: 'Productos',
    ThemeLight: 'Claro',
    ThemeDark: 'Oscuro',
    Language: 'Idioma',
    NotFound: 'No encontrado'
  },
  en: {
    Inicio: 'Home',
    Mesas: 'Tables',
    Pedidos: 'Orders',
    Productos: 'Products',
    Reportes: 'Reports',
    Configuracion: 'Settings',
    TitleInicio: 'Home - Monthly Performance',
    TitleMesas: 'Tables',
    TitleInformes: 'Reports',
    TitleGenerarOrden: 'Create Order',
    TitleConfiguracion: 'Settings',
    TitleProductos: 'Products',
    ThemeLight: 'Light',
    ThemeDark: 'Dark',
    Language: 'Language',
    NotFound: 'Not Found'
  },
  pt: {
    Inicio: 'Início',
    Mesas: 'Mesas',
    Pedidos: 'Pedidos',
    Productos: 'Produtos',
    Reportes: 'Relatórios',
    Configuracion: 'Configurações',
    TitleInicio: 'Início - Desempenho Mensal',
    TitleMesas: 'Mesas',
    TitleInformes: 'Relatórios',
    TitleGenerarOrden: 'Criar Pedido',
    TitleConfiguracion: 'Configurações',
    TitleProductos: 'Produtos',
    ThemeLight: 'Claro',
    ThemeDark: 'Escuro',
    Language: 'Idioma',
    NotFound: 'Não encontrado'
  }
};

interface AppContextType {
  t: (key: keyof typeof translations['es']) => string;
  lang: Language;
  setLang: (l: Language) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('es');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const t = useCallback((key: keyof typeof translations['es']) => {
    return translations[lang][key] || key;
  }, [lang]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <AppContext.Provider value={{ t, lang, setLang, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
