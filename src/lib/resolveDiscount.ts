import type { Discount } from '../db/schema'

interface ProductContext {
  id: string
  categoryId: string
  subcategoryId: string
  brandId: string
  basePrice: number
}

interface VariantContext {
  color: string | null
  size: string | null
  priceOverride: number | null
}

interface ResolvedDiscount {
  /** Precio final en centavos con el descuento aplicado */
  finalPrice: number
  /** Precio original en centavos (sin descuento) */
  originalPrice: number
  /** El descuento que se aplicó */
  discount: Discount
}

/**
 * Evalúa todos los descuentos activos y devuelve el que mayor ahorro produce
 * para un producto + variante específicos.
 *
 * Retorna null si ningún descuento aplica.
 */
export function resolveDiscount(
  product: ProductContext,
  variant: VariantContext,
  activeDiscounts: Discount[],
): ResolvedDiscount | null {
  const now = Date.now()
  const basePrice = variant.priceOverride ?? product.basePrice

  let best: ResolvedDiscount | null = null

  for (const d of activeDiscounts) {
    if (!d.active) continue
    if (d.startDate && d.startDate.getTime() > now) continue
    if (d.endDate && d.endDate.getTime() + 86_400_000 <= now) continue

    // Verificar si el descuento aplica a este producto/variante
    const applies = (() => {
      switch (d.scope) {
        case 'all':
          return true
        case 'product':
          return d.scopeValue === product.id
        case 'category':
          return d.scopeValue === product.categoryId
        case 'subcategory':
          return d.scopeValue === product.subcategoryId
        case 'brand':
          return d.scopeValue === product.brandId
        case 'color':
          return !!variant.color && d.scopeValue?.toLowerCase() === variant.color.toLowerCase()
        case 'size':
          return !!variant.size && d.scopeValue?.toLowerCase() === variant.size.toLowerCase()
        default:
          return false
      }
    })()

    if (!applies) continue

    const finalPrice = d.type === 'percentage'
      ? Math.round(basePrice * (1 - d.value / 100))
      : Math.max(0, basePrice - d.value)

    const saving = basePrice - finalPrice

    // Elegir el descuento que mayor ahorro produce
    if (!best || saving > (best.originalPrice - best.finalPrice)) {
      best = { finalPrice, originalPrice: basePrice, discount: d }
    }
  }

  return best
}
