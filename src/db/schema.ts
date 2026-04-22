import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

// ---------------------------------------------------------------------------
// Catálogos
// ---------------------------------------------------------------------------

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  photoKey: text('photo_key'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

export const subcategories = sqliteTable('subcategories', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  photoKey: text('photo_key'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [
  index('subcategories_category_id_idx').on(t.categoryId),
])

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  subcategoryId: text('subcategory_id').notNull().references(() => subcategories.id),
  brandId: text('brand_id').notNull().references(() => brands.id),
  // Precio en centavos para evitar errores de punto flotante. Ej: $199.90 → 19990
  basePrice: integer('base_price').notNull(),
  featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [
  index('products_category_id_idx').on(t.categoryId),
  index('products_subcategory_id_idx').on(t.subcategoryId),
  index('products_brand_id_idx').on(t.brandId),
  index('products_status_idx').on(t.status),
  index('products_created_at_idx').on(t.createdAt),
])

export const productPhotos = sqliteTable('product_photos', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  // Clave del objeto en Cloudflare R2
  r2Key: text('r2_key').notNull(),
  // Miniatura generada al subir (null para fotos anteriores a Fase 8)
  thumbKey: text('thumb_key'),
  altText: text('alt_text'),
  // La foto con sortOrder = 0 es la principal
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [
  index('product_photos_product_id_idx').on(t.productId),
])

export const productVariants = sqliteTable('product_variants', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  color: text('color'),
  size: text('size'),
  // Si es NULL, se usa products.basePrice
  priceOverride: integer('price_override'),
  status: text('status', { enum: ['active', 'inactive'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [
  index('product_variants_product_id_idx').on(t.productId),
  index('product_variants_color_idx').on(t.color),
  index('product_variants_size_idx').on(t.size),
])

// ---------------------------------------------------------------------------
// Descuentos
// ---------------------------------------------------------------------------

export const discounts = sqliteTable('discounts', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  type: text('type', { enum: ['percentage', 'fixed_amount'] }).notNull(),
  // percentage: valor de 1-100 | fixed_amount: monto en centavos
  value: integer('value').notNull(),
  // Nivel de aplicación del descuento
  scope: text('scope', {
    enum: ['all', 'product', 'category', 'subcategory', 'brand', 'color', 'size'],
  }).notNull(),
  // ID o valor al que aplica. NULL si scope = 'all'
  scopeValue: text('scope_value'),
  // NULL = sin restricción de fecha
  startDate: integer('start_date', { mode: 'timestamp_ms' }),
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  // Permite desactivar manualmente sin eliminar
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (t) => [
  index('discounts_scope_idx').on(t.scope),
  index('discounts_active_idx').on(t.active),
  index('discounts_dates_idx').on(t.startDate, t.endDate),
])

// ---------------------------------------------------------------------------
// Configuración del sitio
// ---------------------------------------------------------------------------

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
})

// ---------------------------------------------------------------------------
// Autenticación (Better Auth)
// ---------------------------------------------------------------------------

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'editor'] }).notNull().default('editor'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
})

// ---------------------------------------------------------------------------
// Tipos de TypeScript inferidos del schema
// ---------------------------------------------------------------------------

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert

export type Subcategory = typeof subcategories.$inferSelect
export type NewSubcategory = typeof subcategories.$inferInsert

export type Brand = typeof brands.$inferSelect
export type NewBrand = typeof brands.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type ProductPhoto = typeof productPhotos.$inferSelect
export type NewProductPhoto = typeof productPhotos.$inferInsert

export type ProductVariant = typeof productVariants.$inferSelect
export type NewProductVariant = typeof productVariants.$inferInsert

export type Discount = typeof discounts.$inferSelect
export type NewDiscount = typeof discounts.$inferInsert

export type Setting = typeof settings.$inferSelect
export type User = typeof user.$inferSelect
