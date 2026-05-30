# RestoApp - Sistema de Facturación y Gestión para Restaurante

¡Bienvenido a **RestoApp**! Esta aplicación es una solución de facturación electrónica y gestión para restaurantes. Está diseñada bajo una arquitectura moderna de software, separando limpiamente la lógica de negocio en el backend y una interfaz interactiva de usuario en el frontend.

---

## 🛠️ Stack Tecnológico

### Backend (FacturacionRestaurante.Server)
- **Framework**: .NET 10 (Web API)
- **Persistencia**: Entity Framework Core (SQL Server / LocalDB)
- **Generación de Reportes**: ClosedXML (Excel)
- **Estilo de Código**: C# 10+, constructores primarios, Records inmutables para DTOs, estructura desacoplada (Controllers -> Services -> DbContext).

### Frontend (facturacionrestaurante.client)
- **Framework**: React 19 (TypeScript)
- **Empaquetador**: Vite
- **Navegación**: React Router DOM (v7)
- **Exportación de Documentos**: jsPDF (PDF)
- **Estilos**: Vanilla CSS moderno con soporte de variables dinámicas para tematización.

---

## 📁 Arquitectura del Proyecto (Refactorización Modular)

El frontend ha sido completamente refactorizado bajo principios de desarrollo modular, separando la lógica en carpetas especializadas para garantizar la mantenibilidad y escalabilidad del código:

```
facturacionrestaurante.client/src/
├── context/
│   └── AppContext.tsx        # Contexto global de traducción (i18n) y tema (Modo Claro/Oscuro)
├── types/
│   └── index.ts              # Tipos e interfaces comunes en TypeScript
├── utils/
│   └── api.ts                # Clientes de Fetch con reintentos y mapeo visual de recursos
├── pages/
│   ├── InicioPage.tsx        # Dashboard con KPI e histograma de ingresos del mes
│   ├── MesasPage.tsx         # Gestión operativa (pedido, precuenta, cobro e impresión PDF)
│   ├── PedidosPage.tsx       # Selección de mesa y creación de comandas interactivas
│   ├── ProductosConfiguracionPage.tsx # CRUD completo (Agregar, modificar y editar) de la carta
│   ├── InformesPage.tsx      # Exportaciones de reportes generales y específicos a Excel
│   └── ConfiguracionPage.tsx # Panel de ajustes de Modo Oscuro e Idiomas (ES, EN, PT)
├── App.tsx                   # Layout principal y declaración de rutas
└── main.tsx                  # Punto de entrada de la aplicación
```

---

## ⚙️ Características Destacadas

1. **Gestión Completa de Carta (CRUD):** Permite añadir nuevos platos o bebidas, actualizar nombres, categorías y precios, persistiendo los datos de inmediato en SQL Server.
2. **Boleta Electrónica PDF:** Genera comprobantes de pago dinámicos en formato A4 aplicando colores corporativos y alineando montos de manera perfecta.
3. **Modo Claro / Oscuro Directo:** Alterna de apariencia instantáneamente inyectando variables del tema en el elemento raíz sin sobrecargar el flujo de React.
4. **Sistema Multilingüe (i18n):** Traduce la interfaz al Español, Inglés y Portugués en tiempo real usando contextos rápidos.
5. **Base de Datos Autogestionada:** Al arrancar el servidor backend, Entity Framework inicializará y creará la base de datos SQL Server LocalDB automáticamente con datos semilla si es que no existe.

---

## 🚀 Guía de Instalación y Puesta en Marcha

### Requisitos Previos
- **Visual Studio 2022** (con soporte para .NET 10 y C# 10) o el SDK de .NET 10.
- **Node.js** (versión 18 o superior).
- **SQL Server LocalDB** (instalado por defecto con las herramientas de escritorio de Visual Studio).

### Pasos Rápidos

1. **Clonar/Abrir la solución** en tu IDE favorito.
2. **Restaurar dependencias del frontend:**
   Abre una consola en la carpeta raíz `facturacionrestaurante.client` y ejecuta:
   ```bash
   npm install
   ```
3. **Ejecutar el proyecto de Backend:**
   Inicia la aplicación ejecutando el proyecto **FacturacionRestaurante.Server** (puedes presionar F5 en Visual Studio o correr `dotnet run` dentro de su carpeta).
   > [!NOTE]
   > El servidor de .NET está configurado con un proxy automático (`SpaProxy`) que levantará el servidor de desarrollo de Vite en el puerto correspondiente, haciendo que frontend y backend interactúen de forma coordinada e integrada automáticamente.

4. **¡Listo!** Abre `https://localhost:54876` (o el puerto configurado en `launchSettings.json`) en tu navegador para evaluar el sistema.
