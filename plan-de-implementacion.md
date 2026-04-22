# Saris — Plan de Implementación

## Convenciones

- Cada tarea es una unidad de trabajo enfocada, completable en una sesión.
- Las tareas dentro de una fase son secuenciales salvo que se indique lo contrario.
- El símbolo `[ ]` indica pendiente, `[x]` indica completado.

---

## Fase 0 — Infraestructura y configuración

> Objetivo: tener el entorno listo para desarrollar. Sin esta fase no se puede avanzar.

- [x] **0.1** Crear repositorio Git e inicializar con el código actual
- [x] **0.2** Crear base de datos D1 en Cloudflare Dashboard y actualizar `database_id` en `wrangler.jsonc`
- [x] **0.3** Crear bucket R2 `saris-media` en Cloudflare Dashboard
- [x] **0.4** Copiar `.env.example` a `.env` y completar las credenciales de Cloudflare
- [x] **0.5** Aplicar migración inicial a D1 (`npm run db:migrate`)
- [x] **0.6** Conectar repositorio a Cloudflare Pages (CI/CD automático en cada push a `main`)

---

## Fase 1 — Fundamentos de la aplicación

> Objetivo: login funcionando y estructura de layouts lista. Todo lo que venga después se construye sobre esto.

- [x] **1.1** Configurar Better Auth: instancia del servidor, esquema de usuario con rol, endpoint `/api/auth/[...all]`
- [x] **1.2** Crear middleware de Astro que proteja todas las rutas `/admin/*` — redirige a login si no hay sesión
- [x] **1.3** Layout base público — estructura HTML, importar Tailwind, placeholder de header y footer
- [x] **1.4** Layout base de administración — sidebar con navegación, header con nombre de usuario y botón de cerrar sesión
- [x] **1.5** Página de login — formulario de email/contraseña, manejo de errores, redirección tras autenticación exitosa
- [x] **1.6** Funcionalidad de cierre de sesión

---

## Fase 2 — Catálogos (Admin)

> Objetivo: poder gestionar las listas predefinidas de categorías, subcategorías y marcas antes de crear productos.

**Categorías**
- [x] **2.1** Listado de categorías — tabla con nombre, slug, orden y acciones
- [x] **2.2** Formulario de creación de categoría — con generación automática de slug
- [x] **2.3** Edición y eliminación de categoría

**Subcategorías**
- [x] **2.4** Listado de subcategorías — agrupadas por categoría
- [x] **2.5** Formulario de creación de subcategoría — con selector de categoría y generación de slug
- [x] **2.6** Edición y eliminación de subcategoría

**Marcas**
- [x] **2.7** Listado de marcas
- [x] **2.8** Formulario de creación de marca — con generación de slug
- [x] **2.9** Edición y eliminación de marca

---

## Fase 3 — Gestión de productos (Admin)

> Objetivo: el administrador y editor pueden capturar y gestionar el catálogo completo de productos.

- [x] **3.1** Listado de productos — tabla con foto miniatura, nombre, marca, precio, estado y acciones. Con filtros por estado, categoría, subcategoría, marca, color y talla. Paginación cliente (20 por página)
- [x] **3.2** Formulario de producto — campos base: nombre, descripción, categoría, subcategoría, marca, precio
  - Generación automática de slug a partir del nombre
  - Validación en servidor
- [x] **3.3** Subida de fotos del producto
  - Upload directo a R2 (máximo 3 fotos)
  - Vista previa de imágenes
  - Reordenamiento de fotos (la primera es la principal)
  - Eliminación de foto individual
- [x] **3.4** Gestión de variantes dentro del formulario de producto
  - Agregar variante con color, talla y precio opcional
  - Si no se definen variantes, se crea automáticamente una variante "default"
  - Editar y eliminar variantes
- [x] **3.5** Edición de producto existente — cargar todos los datos actuales en el formulario
- [x] **3.6** Activar / desactivar producto desde el listado (toggle rápido sin entrar al formulario)
- [x] **3.7** Eliminación de producto — eliminar fotos de R2 antes de borrar el registro

---

## Fase 4 — Descuentos (Admin)

> Objetivo: poder crear descuentos individuales y masivos con vigencia por fechas.

- [x] **4.1** Listado de descuentos — tabla con estado (activo/programado/expirado), alcance, tipo, valor y fechas
- [x] **4.2** Formulario de descuento
  - Tipo: porcentaje o monto fijo
  - Alcance: todos, producto, categoría, subcategoría, marca, color, talla
  - Selector dinámico del valor del alcance (ej. si elige "categoría", muestra selector de categorías)
  - Fecha de inicio y fin (opcionales)
- [x] **4.3** Edición y desactivación manual de descuentos
- [x] **4.4** Función utilitaria `resolveDiscount(product, variant)` — consulta todos los descuentos activos que aplican y devuelve el de mayor valor. Usada tanto en el admin como en el catálogo público

---

## Fase 5 — Catálogo público

> Objetivo: el catálogo funcional, filtrable y compartible que verán los clientes.

- [x] **5.1** Componente de tarjeta de producto — foto, nombre, marca, precio con/sin descuento, botón de WhatsApp
- [x] **5.2** Página principal del catálogo (`/`) — grid de productos activos, orden por más recientes
- [x] **5.3** Paginación infinita — cargar más productos al hacer scroll (endpoint API + React island)
- [x] **5.4** Panel de filtros
  - Filtrar por: categoría, subcategoría, marca, color, talla, rango de precio
  - Los filtros activos se reflejan en la URL como query params
- [x] **5.5** Búsqueda por texto libre — filtra por nombre y descripción del producto
- [x] **5.6** URL compartible — al aplicar filtros la URL se actualiza; compartir esa URL reproduce los mismos filtros
- [x] **5.7** Página de detalle de producto (`/p/[slug]`)
  - Galería de fotos (principal + miniaturas)
  - Selector de variante (color/talla) con actualización de precio
  - Precio con descuento aplicado (tachado si hay descuento)
  - Botón "Contactar por WhatsApp" — abre WhatsApp con mensaje prellenado con el nombre del producto y URL
- [x] **5.8** Homepage rediseñado (`/`) — secciones por categoría con hero + foto, grid de subcategorías, sección de productos destacados con botón de WhatsApp
- [x] **5.9** Foto de categoría y subcategoría — upload/delete desde el panel admin (endpoint R2 + UI)
- [x] **5.10** Campo `featured` en productos — toggle desde el listado admin para marcar productos destacados en el homepage

---

## Fase 6 — SEO y Analytics

> Objetivo: que los productos aparezcan en Google y que los links compartidos en WhatsApp generen previsualización.

- [x] **6.1** Meta tags dinámicos — `<title>`, `<meta name="description">` y `<link rel="canonical">` en todas las páginas públicas; nombre del sitio leído desde `settings`
- [x] **6.2** Open Graph — `og:title`, `og:description`, `og:image`, `og:url`, `og:type=product` en la página de detalle; props `ogImage` y `ogUrl` en el Layout
- [x] **6.3** Sitemap dinámico — `/sitemap.xml` con homepage, `/catalogo` y todas las páginas de productos activos con `<lastmod>`
- [x] **6.4** `robots.txt` dinámico — permite catálogo, bloquea `/admin/`, `/api/` y `/login`; incluye URL del sitemap
- [x] **6.5** Datos estructurados JSON-LD — schema `Product` en `/p/[slug]` con nombre, descripción, imágenes, marca, precio y disponibilidad
- [x] **6.6** Google Analytics GA4 — script gtag activado automáticamente si `ga_measurement_id` está configurado en Settings admin

---

## Fase 7 — Usuarios y configuración (Admin)

> Objetivo: el administrador puede gestionar quién tiene acceso y configurar datos globales del sitio.

**Usuarios**
- [x] **7.1** Listado de usuarios — nombre, email, rol y fecha de creación
- [x] **7.2** Crear nuevo usuario — email, nombre, contraseña temporal, rol (admin/editor)
- [x] **7.3** Editar rol de usuario y restablecer contraseña
- [x] **7.4** Perfil propio — cambiar nombre y contraseña

**Configuración del sitio**
- [x] **7.5** Página de configuración — editar número de WhatsApp, nombre del sitio, dirección y horario (`/admin/configuracion`, solo rol admin)
- [x] **7.6** Semilla de datos iniciales de `settings` — manejada mediante upsert en el endpoint PUT; las claves se crean al primer guardado sin necesidad de migración separada

---

## Fase 8 — Pulido y despliegue

> Objetivo: la aplicación lista para uso real con dominio propio.

**Calidad y UX**
- [x] **8.1** Estados de carga — skeletons en el catálogo, spinners en formularios del admin
- [x] **8.2** Manejo de errores — páginas 404 y 500, mensajes de error claros en formularios
- [x] **8.3** Revisión responsive — probar catálogo y admin en móvil (iOS y Android)
- [x] **8.4** Optimización de imágenes — generar miniatura (thumbnail) al subir a R2 para usar en listados; imagen completa solo en detalle

**Despliegue**
- [x] **8.5** Configurar variables de entorno (`secrets`) en Cloudflare Pages para producción
- [x] **8.6** Configurar dominio personalizado (`saris.mx` o `saris.store`) en Cloudflare Pages
- [x] **8.7** Verificar que las migraciones de D1 se aplicaron en producción
- [x] **8.8** Prueba de extremo a extremo en producción — crear producto, verlo en catálogo, compartir por WhatsApp

---

## Resumen por fases

| Fase | Descripción | Tareas | Completadas |
|---|---|---|---|
| 0 | Infraestructura | 6 | 6 |
| 1 | Fundamentos (auth + layouts) | 6 | 6 |
| 2 | Catálogos (admin) | 9 | 9 |
| 3 | Productos (admin) | 7 | 7 |
| 4 | Descuentos (admin) | 4 | 4 |
| 5 | Catálogo público | 10 | 10 |
| 6 | SEO y Analytics | 6 | 6 |
| 7 | Usuarios y configuración | 6 | 6 |
| 8 | Pulido y despliegue | 8 | 8 |
| **Total** | | **62** | **62** |
