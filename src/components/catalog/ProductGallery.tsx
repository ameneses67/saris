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

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
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
        <div className="aspect-square w-full overflow-hidden rounded-[2rem] bg-linen shadow-sm border border-terracotta/5">
          {activePhoto ? (
            <img
              src={`/api/media/${activePhoto.r2Key}`}
              alt={productName}
              className="h-full w-full object-cover transition-opacity duration-500"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-terracotta/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Miniaturas */}
        {photos.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setActivePhotoIndex(i)}
                className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
                  i === activePhotoIndex ? 'border-terracotta scale-95' : 'border-transparent opacity-60 hover:opacity-100'
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
        <div className="mb-10 pb-8 border-b border-terracotta/10">
          {activeVariant?.discountedPrice !== null && activeVariant?.discountedPrice !== undefined ? (
            <div className="flex items-center gap-4">
              <p className="text-5xl font-brand font-bold text-terracotta tracking-tight">{fmt(activeVariant.discountedPrice)}</p>
              <p className="text-xl text-espresso/30 line-through font-light italic">{fmt(activeVariant.price)}</p>
              <span className="bg-terracotta/10 text-terracotta text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                Oferta Especial
              </span>
            </div>
          ) : (
            <p className="text-5xl font-brand font-bold text-espresso tracking-tight">
              {activeVariant ? fmt(activeVariant.price) : '—'}
            </p>
          )}
        </div>

        {/* Selector de color */}
        {hasColors && (
          <div className="mb-8">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-espresso/40">
              Seleccionar Color: <span className="text-espresso">{initColor}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {uniqueColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`rounded-2xl border-2 px-6 py-3 text-sm font-bold transition-all duration-500 ${
                    initColor === color
                      ? 'border-terracotta bg-terracotta text-white shadow-lg shadow-terracotta/20 -translate-y-1'
                      : 'border-terracotta/5 text-espresso/60 hover:border-terracotta/20 bg-white hover:bg-linen/30'
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
          <div className="mb-12">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-espresso/40">
              Seleccionar Talla: <span className="text-espresso">{initSize}</span>
            </p>
            <div className="flex flex-wrap gap-3">
              {uniqueSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-[4rem] rounded-2xl border-2 px-6 py-3 text-sm font-bold transition-all duration-500 ${
                    initSize === size
                      ? 'border-espresso bg-espresso text-white shadow-xl shadow-espresso/10 -translate-y-1'
                      : 'border-terracotta/5 text-espresso/60 hover:border-terracotta/20 bg-white hover:bg-linen/30'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botón WhatsApp y Beneficios */}
        <div className="mt-auto space-y-8">
          {whatsappNumber ? (
            <div className="space-y-6">
              <a
                href={waUrl(whatsappNumber, productName, productUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-4 rounded-[2rem] bg-espresso px-10 py-6 text-base font-bold text-white shadow-2xl transition-all duration-500 hover:bg-terracotta hover:-translate-y-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-terracotta/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current relative z-10 transition-transform group-hover:rotate-12">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="relative z-10 uppercase tracking-[0.2em] text-sm">Lo quiero</span>
              </a>

              {/* Beneficios Rápidos */}
              <div className="grid grid-cols-3 gap-4 py-6 border-y border-terracotta/5">
                <div className="flex flex-col items-center text-center gap-2">
                  <svg className="w-5 h-5 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-espresso/40">Envíos Seguros</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2 border-x border-terracotta/5">
                  <svg className="w-5 h-5 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-espresso/40">Calidad Saris</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <svg className="w-5 h-5 text-terracotta" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <span className="text-[9px] uppercase font-bold tracking-widest text-espresso/40">Asesoría Hoy</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[2.5rem] bg-linen border-2 border-dashed border-terracotta/10 p-10 text-center">
              <p className="text-sm font-medium text-espresso/40 italic">
                Estamos personalizando los detalles de esta pieza para ti.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
