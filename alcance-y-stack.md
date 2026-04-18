# Saris — Alcance del Proyecto y Stack Tecnológico

## Problema

Actualmente los productos se promueven a través de catálogos físicos, a veces digitales, y vía WhatsApp de manera manual. Cuando un cliente requiere información se pone en contacto principalmente por WhatsApp, y se le responde de forma individual adjuntando fotos tomadas al momento. Este proceso es lento, tedioso y dependiente de disponibilidad inmediata.

## Solución

Crear una página web pública para catalogar todos los productos, accesible en internet y compartible vía WhatsApp y redes sociales. No es una tienda en línea — el objetivo es mostrar la información de los productos de manera organizada y facilitar el contacto del cliente.

La solución se desarrolla en dos fases:

- **Fase 1**: Catálogo web con administración de productos
- **Fase 2**: Publicación automática del catálogo en Facebook e Instagram

---

## Características

### Catálogo público

- Listado de productos con búsqueda por texto libre
- Filtros por cualquier característica del producto
- URL compartible que incluye los filtros activos (para enviar por WhatsApp)
- Metadatos Open Graph para previsualización al compartir en WhatsApp y redes sociales
- Paginación infinita (scroll)
- Orden por defecto: productos más recientes primero
- Botón "Contactar por WhatsApp" en cada producto (número configurable)
- SEO optimizado
- Google Analytics
- Idioma: español de México
- Diseño responsivo, optimizado para celular

### Productos

Cada producto contiene la siguiente información:

| Campo | Requerido | Notas |
|---|---|---|
| Nombre | Sí | |
| Descripción | Sí | |
| Categoría | Sí | Catálogo predefinido |
| Subcategoría | Sí | Predefinida y ligada a una sola categoría |
| Marca | Sí | Catálogo predefinido |
| Precio | Sí | Incluye IVA, siempre requerido |
| Descuento | No | En monto fijo o porcentaje, con fecha de inicio y fin |
| Talla / Tamaño | No | |
| Color | No | |
| Fotos | No | 1 a 3 fotos por producto (no por variante) |
| Estado | Sí | Activo / Inactivo |

#### Variantes

Un producto puede tener variantes que difieren en color y/o talla. Las variantes de un mismo producto pueden tener el mismo precio o precios distintos. Las fotos son compartidas por todas las variantes del producto.

### Descuentos

- Los descuentos se pueden aplicar de forma individual por producto o de forma masiva por característica (categoría, subcategoría, marca, color, talla, etc.)
- Cada descuento tiene fecha de inicio y fecha de fin
- Si un producto califica para más de un descuento activo, se aplica el de mayor valor
- El descuento aplica igual a todas las variantes del producto

### Catálogos administrables

Los siguientes catálogos son predefinidos y administrables desde la plataforma:

- **Categorías** — agrupan subcategorías
- **Subcategorías** — cada una pertenece a una sola categoría
- **Marcas**

Solo el usuario Administrador puede crear, editar o eliminar estos catálogos.

### Administración de usuarios

| Rol | Permisos |
|---|---|
| **Administrador** | Acceso total: productos, catálogos, usuarios, configuración |
| **Editor** | Captura y edición de productos únicamente |

La interfaz de administración debe funcionar correctamente desde celular.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Framework | **Astro** + adaptador Cloudflare | SSR y generación estática, excelente para SEO |
| Hosting | **Cloudflare Pages** | Free tier generoso, integración nativa con Astro |
| Base de datos | **Cloudflare D1** (SQLite) | Nativa de Cloudflare, free tier suficiente para cientos de productos |
| Almacenamiento de imágenes | **Cloudflare R2** | 10 GB gratuitos/mes, compatible con S3 |
| ORM | **Drizzle ORM** | Diseñado para entornos edge/Workers, compatibilidad perfecta con D1 |
| Estilos | **Tailwind CSS** | Desarrollo responsivo rápido |
| Autenticación | **Better Auth** | Compatible con Cloudflare Workers |
| Interactividad (admin) | **React** (islands de Astro) | Interactividad solo donde se necesita |

### Infraestructura y costos estimados

- **Cloudflare Pages / D1 / R2**: gratuito dentro de los límites del free tier (suficiente para bajo tráfico)
- **Dominio**: `saris.mx` (~$15 USD/año en NIC México) o `saris.store`
- Costo mensual esperado durante fase inicial: **$0**

---

## Fases de Desarrollo

### Fase 1 — Catálogo web (alcance actual)

1. Configuración del proyecto y despliegue en Cloudflare
2. Modelo de datos y migraciones (Drizzle + D1)
3. Panel de administración (productos, catálogos, usuarios)
4. Catálogo público (filtros, búsqueda, SEO, Open Graph)
5. Sistema de descuentos
6. Integración de Google Analytics

### Fase 2 — Redes sociales (alcance futuro)

- Publicación automática de productos en Facebook e Instagram
