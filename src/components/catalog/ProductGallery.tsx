import { useState, useMemo } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Photo {
  id: string
  r2Key: string
  sortOrder: number
}

interface Variant {
  id: string
  color: string | null
  size: string | null
  price: number         // priceOverride ?? basePrice, en centavos
  discountedPrice: number | null
}

interface Props {
  photos: Photo[]
  variants: Variant[]
  productName: string
  productSlug: string
  whatsappNumber: string
  siteUrl: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const fmt = (cents: number) => MXN.format(cents / 100)

function waUrl(number: string, productName: string, productUrl: string) {
  const text = encodeURIComponent(`Hola! Me interesa este producto: ${productName} — ${productUrl}`)
  return `https://wa.me/${number}?text=${text}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ProductGallery({
  photos,
  variants,
  productName,
  productSlug,
  whatsappNumber,
  siteUrl,
}: Props) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [selectedSize, setSelectedSize] = useState<string | null>(null)

  const productUrl = `${siteUrl}/p/${productSlug}`

  // ── Variantes disponibles ──────────────────────────────────────────────────

  const hasColors = variants.some((v) => v.color !== null)
  const hasSizes = variants.some((v) => v.size !== null)
  const isDefaultOnly = !hasColors && !hasSizes

  const uniqueColors = useMemo(
    () => [...new Set(variants.filter((v) => v.color).map((v) => v.color!))],
    [variants]
  )
  const uniqueSizes = useMemo(
    () => [...new Set(variants.filter((v) => v.size).map((v) => v.size!))],
    [variants]
  )

  // Inicializar selección con primera variante disponible
  const initColor = selectedColor ?? uniqueColors[0] ?? null
  const initSize = selectedSize ?? uniqueSizes[0] ?? null

  // Variante activa
  const activeVariant = useMemo(() => {
    if (isDefaultOnly) return variants[0]
    return (
      variants.find((v) => {
        const colorMatch = !hasColors || v.color === initColor
        const sizeMatch = !hasSizes || v.size === initSize
        return colorMatch && sizeMatch
      }) ?? variants[0]
    )
  }, [initColor, initSize, variants, hasColors, hasSizes, isDefaultOnly])

  // ── Render ─────────────────────────────────────────────────────────────────

  const activePhoto = photos[activePhotoIndex]

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      {/* Galería */}
      <div className="flex flex-col gap-3">
        {/* Foto principal */}
        <div className="aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
          {activePhoto ? (
            <img
              src={`/api/media/${activePhoto.r2Key}`}
              alt={productName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Miniaturas */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setActivePhotoIndex(i)}
                className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                  i === activePhotoIndex ? 'border-gray-900' : 'border-transparent hover:border-gray-300'
                }`}
              >
                <img
                  src={`/api/media/${photo.r2Key}`}
                  alt={`${productName} ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info + variantes + precio + WhatsApp */}
      <div className="flex flex-col">
        {/* Precio */}
        <div className="mb-6">
          {activeVariant?.discountedPrice !== null && activeVariant?.discountedPrice !== undefined ? (
            <>
              <p className="text-sm text-gray-400 line-through">{fmt(activeVariant.price)}</p>
              <p className="text-3xl font-bold text-green-700">{fmt(activeVariant.discountedPrice)}</p>
            </>
          ) : (
            <p className="text-3xl font-bold text-gray-900">
              {activeVariant ? fmt(activeVariant.price) : '—'}
            </p>
          )}
        </div>

        {/* Selector de color */}
        {hasColors && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Color: <span className="font-normal text-gray-500">{initColor}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    initColor === color
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selector de talla */}
        {hasSizes && (
          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Talla: <span className="font-normal text-gray-500">{initSize}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {uniqueSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    initSize === size
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botón WhatsApp */}
        {whatsappNumber ? (
          <a
            href={waUrl(whatsappNumber, productName, productUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-green-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar por WhatsApp
          </a>
        ) : (
          <div className="mt-auto rounded-xl border border-dashed border-gray-200 px-6 py-4 text-center text-sm text-gray-400">
            Configura el número de WhatsApp en Ajustes para mostrar este botón.
          </div>
        )}
      </div>
    </div>
  )
}
