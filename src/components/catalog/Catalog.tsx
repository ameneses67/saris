import { useState, useEffect, useRef, useMemo } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CatalogProduct {
  id: string
  slug: string
  name: string
  brandName: string | null
  basePrice: number
  discountedPrice: number | null
  mainPhotoKey: string | null
  mainThumbKey: string | null
}

interface FilterOption { id: string; name: string }
interface SubcategoryOption { id: string; categoryId: string; name: string }

interface Filters {
  q: string
  category: string
  subcategory: string
  brand: string
  color: string
  size: string
  minPrice: string
  maxPrice: string
}

interface Props {
  initialProducts: CatalogProduct[]
  initialHasMore: boolean
  initialFilters: Filters
  categories: FilterOption[]
  subcategories: SubcategoryOption[]
  brands: FilterOption[]
  colorOptions: string[]
  sizeOptions: string[]
  whatsappNumber: string
  siteUrl: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const fmt = (cents: number) => MXN.format(cents / 100)

function buildParams(f: Filters, page: number) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('category', f.category)
  if (f.subcategory) p.set('subcategory', f.subcategory)
  if (f.brand) p.set('brand', f.brand)
  if (f.color) p.set('color', f.color)
  if (f.size) p.set('size', f.size)
  if (f.minPrice) p.set('minPrice', f.minPrice)
  if (f.maxPrice) p.set('maxPrice', f.maxPrice)
  p.set('page', String(page))
  return p
}

function syncUrl(f: Filters) {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('category', f.category)
  if (f.subcategory) p.set('subcategory', f.subcategory)
  if (f.brand) p.set('brand', f.brand)
  if (f.color) p.set('color', f.color)
  if (f.size) p.set('size', f.size)
  if (f.minPrice) p.set('minPrice', f.minPrice)
  if (f.maxPrice) p.set('maxPrice', f.maxPrice)
  const qs = p.toString()
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname)
}

function waUrl(number: string, productName: string, productUrl: string) {
  const text = encodeURIComponent(`Hola! Me interesa este producto: ${productName} — ${productUrl}`)
  return `https://wa.me/${number}?text=${text}`
}

// ─── Tarjeta de producto ──────────────────────────────────────────────────────

function ProductCard({
  product,
  whatsappNumber,
  siteUrl,
}: {
  product: CatalogProduct
  whatsappNumber: string
  siteUrl: string
}) {
  const productUrl = `${siteUrl}/p/${product.slug}`

  return (
    <a
      href={`/p/${product.slug}`}
      className="card-premium group flex flex-col"
    >
      {/* Foto */}
      <div className="aspect-[3/4] w-full overflow-hidden bg-linen">
        {product.mainPhotoKey ? (
          <img
            src={`/api/media/${product.mainThumbKey ?? product.mainPhotoKey}`}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-terracotta/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-5">
        {product.brandName && (
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-terracotta/60">
            {product.brandName}
          </p>
        )}
        <p className="mb-3 text-lg font-brand font-semibold text-espresso line-clamp-1 leading-snug group-hover:text-terracotta transition-colors">
          {product.name}
        </p>

        {/* Precio */}
        <div className="mt-auto flex items-baseline gap-2">
          {product.discountedPrice !== null ? (
            <>
              <p className="text-lg font-bold text-terracotta">{fmt(product.discountedPrice)}</p>
              <p className="text-xs text-espresso/40 line-through">{fmt(product.basePrice)}</p>
            </>
          ) : (
            <p className="text-lg font-bold text-espresso">{fmt(product.basePrice)}</p>
          )}
        </div>

        {/* Botón WhatsApp */}
        {whatsappNumber && (
          <a
            href={waUrl(whatsappNumber, product.name, productUrl)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-terracotta/10 px-3 py-2.5 text-xs font-bold text-terracotta transition-all hover:bg-terracotta hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Preguntar
          </a>
        )}
      </div>
    </a>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Catalog({
  initialProducts,
  initialHasMore,
  initialFilters,
  categories,
  subcategories,
  brands,
  colorOptions,
  sizeOptions,
  whatsappNumber,
  siteUrl,
}: Props) {
  const [productList, setProductList] = useState<CatalogProduct[]>(initialProducts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [firstLoad, setFirstLoad] = useState(false)

  // Filtros aplicados
  const [filters, setFilters] = useState<Filters>(initialFilters)
  // Inputs de texto (debounced)
  const [searchInput, setSearchInput] = useState(initialFilters.q)
  const [minPriceInput, setMinPriceInput] = useState(initialFilters.minPrice)
  const [maxPriceInput, setMaxPriceInput] = useState(initialFilters.maxPrice)

  // Para evitar stale closures en el IntersectionObserver
  const stateRef = useRef({ loading, hasMore, currentPage, filters })
  stateRef.current = { loading, hasMore, currentPage, filters }

  const sentinelRef = useRef<HTMLDivElement>(null)

  // Subcategorías filtradas según categoría seleccionada
  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.categoryId === filters.category),
    [subcategories, filters.category]
  )

  const hasActiveFilters = !!(
    filters.q || filters.category || filters.subcategory ||
    filters.brand || filters.color || filters.size ||
    filters.minPrice || filters.maxPrice
  )

  // ── Aplicar filtros ───────────────────────────────────────────────────────

  async function applyFilters(newFilters: Filters) {
    setFilters(newFilters)
    syncUrl(newFilters)
    setFirstLoad(true)
    setProductList([])
    setHasMore(false)

    try {
      const res = await fetch(`/api/catalog/products?${buildParams(newFilters, 1)}`)
      if (!res.ok) return
      const data = await res.json() as { products: CatalogProduct[]; hasMore: boolean }
      setProductList(data.products)
      setHasMore(data.hasMore)
      setCurrentPage(1)
    } finally {
      setFirstLoad(false)
    }
  }

  function setFilter(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value }
    if (key === 'category') next.subcategory = ''
    applyFilters(next)
  }

  function clearFilters() {
    const empty: Filters = { q: '', category: '', subcategory: '', brand: '', color: '', size: '', minPrice: '', maxPrice: '' }
    setSearchInput('')
    setMinPriceInput('')
    setMaxPriceInput('')
    applyFilters(empty)
  }

  // ── Debounce search ────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== filters.q) {
        applyFilters({ ...filters, q: searchInput })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput]) // eslint-disable-line

  // ── Debounce price ────────────────────────────────────────────────────────

  useEffect(() => {
    const t = setTimeout(() => {
      if (minPriceInput !== filters.minPrice || maxPriceInput !== filters.maxPrice) {
        applyFilters({ ...filters, minPrice: minPriceInput, maxPrice: maxPriceInput })
      }
    }, 600)
    return () => clearTimeout(t)
  }, [minPriceInput, maxPriceInput]) // eslint-disable-line

  // ── Infinite scroll ───────────────────────────────────────────────────────

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return
        const { loading, hasMore, currentPage, filters } = stateRef.current
        if (loading || !hasMore) return

        setLoading(true)
        try {
          const nextPage = currentPage + 1
          const res = await fetch(`/api/catalog/products?${buildParams(filters, nextPage)}`)
          if (!res.ok) return
          const data = await res.json() as { products: CatalogProduct[]; hasMore: boolean }
          setProductList((prev) => [...prev, ...data.products])
          setHasMore(data.hasMore)
          setCurrentPage(nextPage)
        } finally {
          setLoading(false)
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, []) // Solo se monta una vez; usa stateRef para datos frescos

  // ── Render ────────────────────────────────────────────────────────────────

  const selectCls = 'rounded-xl border border-terracotta/10 bg-white px-4 py-2 text-sm text-espresso font-medium focus:border-terracotta focus:ring-1 focus:ring-terracotta focus:outline-none transition-all'
  const inputCls = 'w-24 rounded-xl border border-terracotta/10 bg-white px-3 py-2 text-sm text-espresso focus:border-terracotta focus:ring-1 focus:ring-terracotta focus:outline-none transition-all'

  return (
    <div>
      {/* Buscador */}
      <div className="mb-8">
        <div className="relative max-w-2xl mx-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-terracotta/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="¿Qué estás buscando hoy?"
            className="w-full rounded-2xl border border-terracotta/10 bg-white py-4 pl-12 pr-6 text-base text-espresso shadow-sm focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 focus:outline-none transition-all placeholder:text-espresso/30"
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {/* Categoría */}
        <select value={filters.category} onChange={(e) => setFilter('category', e.target.value)} className={selectCls}>
          <option value="">Categoría</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Subcategoría */}
        <select
          value={filters.subcategory}
          onChange={(e) => setFilter('subcategory', e.target.value)}
          disabled={!filters.category}
          className={`${selectCls} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <option value="">Subcategoría</option>
          {filteredSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {/* Marca */}
        <select value={filters.brand} onChange={(e) => setFilter('brand', e.target.value)} className={selectCls}>
          <option value="">Marca</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        {/* Color */}
        {colorOptions.length > 0 && (
          <select value={filters.color} onChange={(e) => setFilter('color', e.target.value)} className={selectCls}>
            <option value="">Color</option>
            {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* Talla */}
        {sizeOptions.length > 0 && (
          <select value={filters.size} onChange={(e) => setFilter('size', e.target.value)} className={selectCls}>
            <option value="">Talla</option>
            {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Precio */}
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-400">$</span>
          <input
            type="number"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            placeholder="Min"
            min={0}
            className={inputCls}
          />
          <span className="text-sm text-gray-400">—</span>
          <input
            type="number"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            placeholder="Máx"
            min={0}
            className={inputCls}
          />
        </div>

        {/* Limpiar */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Grid / estados */}
      {firstLoad ? (
        /* Skeleton mientras carga primera página */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="aspect-[3/4] w-full animate-pulse bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : productList.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-gray-400">
            {hasActiveFilters ? 'No hay productos que coincidan con los filtros.' : 'No hay productos disponibles.'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm font-medium text-gray-700 underline underline-offset-2">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {productList.map((p) => (
            <ProductCard key={p.id} product={p} whatsappNumber={whatsappNumber} siteUrl={siteUrl} />
          ))}
        </div>
      )}

      {/* Sentinel para infinite scroll */}
      <div ref={sentinelRef} className="h-px" />

      {/* Indicador de carga (scroll) */}
      {loading && !firstLoad && (
        <div className="mt-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-gray-700" />
        </div>
      )}

      {/* Sin más resultados */}
      {!hasMore && productList.length > 0 && !loading && !firstLoad && (
        <p className="mt-8 text-center text-xs text-gray-400">
          {productList.length} {productList.length === 1 ? 'producto' : 'productos'}
        </p>
      )}
    </div>
  )
}
