import { useState, useMemo, useRef } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category { id: string; name: string; slug: string }
interface Subcategory { id: string; categoryId: string; name: string; slug: string }
interface Brand { id: string; name: string }

interface Product {
  id: string
  slug: string
  name: string
  description: string
  categoryId: string
  categoryName: string | null
  subcategoryId: string
  subcategoryName: string | null
  brandId: string
  brandName: string | null
  basePrice: number
  discountedPrice: number | null
  featured: boolean
  status: 'active' | 'inactive'
  mainPhotoKey: string | null
}

interface VariantSummary { productId: string; color: string | null; size: string | null }

interface NewVariant {
  _key: string
  color: string
  size: string
  priceOverride: string
  status: 'active' | 'inactive'
}

interface Props {
  initialProducts: Product[]
  categories: Category[]
  subcategories: Subcategory[]
  brands: Brand[]
  variantSummaries: VariantSummary[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20
const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function centavosToDisplay(centavos: number) {
  return (centavos / 100).toFixed(2)
}

function displayToCentavos(value: string) {
  return Math.round(parseFloat(value) * 100)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function ProductsManager({ initialProducts, categories, subcategories, brands, variantSummaries }: Props) {
  const [productList, setProductList] = useState<Product[]>(initialProducts)

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSubcategory, setFilterSubcategory] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterColor, setFilterColor] = useState('')
  const [filterSize, setFilterSize] = useState('')

  const [page, setPage] = useState(1)

  // Modal crear
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('')
  const [newVariants, setNewVariants] = useState<NewVariant[]>([])
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const createPhotoRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  // Toggle loading per-row
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────

  // Mapas productId → Set de colores/tallas (para filtros)
  const colorsByProduct = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const v of variantSummaries) {
      if (!v.color) continue
      if (!map.has(v.productId)) map.set(v.productId, new Set())
      map.get(v.productId)!.add(v.color)
    }
    return map
  }, [variantSummaries])

  const sizesByProduct = useMemo(() => {
    const map = new Map<string, Set<string>>()
    for (const v of variantSummaries) {
      if (!v.size) continue
      if (!map.has(v.productId)) map.set(v.productId, new Set())
      map.get(v.productId)!.add(v.size)
    }
    return map
  }, [variantSummaries])

  // Opciones únicas para los selects de color y talla
  const colorOptions = useMemo(() => {
    const all = new Set<string>()
    for (const v of variantSummaries) { if (v.color) all.add(v.color) }
    return [...all].sort((a, b) => a.localeCompare(b))
  }, [variantSummaries])

  const sizeOptions = useMemo(() => {
    const all = new Set<string>()
    for (const v of variantSummaries) { if (v.size) all.add(v.size) }
    return [...all].sort((a, b) => a.localeCompare(b))
  }, [variantSummaries])

  // Subcategorías del filtro de categoría seleccionado
  const filterSubcategoryOptions = useMemo(
    () => subcategories.filter((s) => s.categoryId === filterCategory),
    [subcategories, filterCategory]
  )

  const filteredProducts = useMemo(() => {
    return productList.filter((p) => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      if (filterCategory && p.categoryId !== filterCategory) return false
      if (filterSubcategory && p.subcategoryId !== filterSubcategory) return false
      if (filterBrand && p.brandId !== filterBrand) return false
      if (filterColor && !colorsByProduct.get(p.id)?.has(filterColor)) return false
      if (filterSize && !sizesByProduct.get(p.id)?.has(filterSize)) return false
      return true
    })
  }, [productList, filterStatus, filterCategory, filterSubcategory, filterBrand, filterColor, filterSize, colorsByProduct, sizesByProduct])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pagedProducts = filteredProducts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const hasActiveFilters = filterStatus !== 'all' || filterCategory || filterSubcategory || filterBrand || filterColor || filterSize

  function clearFilters() {
    setFilterStatus('all')
    setFilterCategory('')
    setFilterSubcategory('')
    setFilterBrand('')
    setFilterColor('')
    setFilterSize('')
    setPage(1)
  }

  // Para el modal de creación (estado independiente de los filtros)
  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.categoryId === selectedCategoryId),
    [subcategories, selectedCategoryId]
  )

  // ── Handlers ──────────────────────────────────────────────────────────────
  function openCreate() {
    setError('')
    setSelectedCategoryId('')
    setSelectedSubcategoryId('')
    setNewVariants([])
    setPendingPhoto(null)
    setPendingPreview(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setModalOpen(false)
    setSelectedCategoryId('')
    setSelectedSubcategoryId('')
    setNewVariants([])
    setPendingPhoto(null)
    setPendingPreview(null)
    setError('')
  }

  function handleCreatePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingPhoto(file)
    setPendingPreview(URL.createObjectURL(file))
    if (createPhotoRef.current) createPhotoRef.current.value = ''
  }

  function clearPendingPhoto() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingPhoto(null)
    setPendingPreview(null)
  }

  async function generateThumb(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const THUMB_W = 400, THUMB_H = 533
        const srcRatio = img.width / img.height
        const dstRatio = THUMB_W / THUMB_H
        let sx = 0, sy = 0, sw = img.width, sh = img.height
        if (srcRatio > dstRatio) { sw = img.height * dstRatio; sx = (img.width - sw) / 2 }
        else { sh = img.width / dstRatio; sy = (img.height - sh) / 2 }
        const canvas = document.createElement('canvas')
        canvas.width = THUMB_W; canvas.height = THUMB_H
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, THUMB_W, THUMB_H)
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('No se pudo generar la miniatura'))
        }, 'image/jpeg', 0.82)
      }
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen inválida')) }
      img.src = url
    })
  }

  function addVariantRow() {
    setNewVariants((prev) => [
      ...prev,
      { _key: crypto.randomUUID(), color: '', size: '', priceOverride: '', status: 'active' },
    ])
  }

  function removeVariantRow(key: string) {
    setNewVariants((prev) => prev.filter((v) => v._key !== key))
  }

  function updateVariantRow(key: string, field: keyof Omit<NewVariant, '_key'>, value: string) {
    setNewVariants((prev) =>
      prev.map((v) => v._key === key ? { ...v, [field]: value } : v)
    )
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()
    const brandId = (form.elements.namedItem('brandId') as unknown as HTMLSelectElement).value
    const priceDisplay = (form.elements.namedItem('basePrice') as HTMLInputElement).value
    const basePrice = displayToCentavos(priceDisplay)
    const status = (form.elements.namedItem('status') as unknown as HTMLSelectElement).value as 'active' | 'inactive'

    try {
      const variants = newVariants
        .filter((v) => v.color.trim() || v.size.trim())
        .map((v) => ({
          color: v.color.trim() || undefined,
          size: v.size.trim() || undefined,
          priceOverride: v.priceOverride ? displayToCentavos(v.priceOverride) : null,
          status: v.status,
        }))

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          brandId,
          basePrice,
          status,
          variants,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al guardar')
        return
      }

      const saved = await res.json() as Product
      const catName = categories.find((c) => c.id === saved.categoryId)?.name ?? null
      const subName = subcategories.find((s) => s.id === saved.subcategoryId)?.name ?? null
      const brandName = brands.find((b) => b.id === saved.brandId)?.name ?? null

      let mainPhotoKey: string | null = null
      if (pendingPhoto) {
        const fd = new FormData()
        fd.append('file', pendingPhoto)
        try {
          const thumb = await generateThumb(pendingPhoto)
          fd.append('thumb', thumb, 'thumb.jpg')
        } catch { /* continuar sin miniatura */ }
        const photoRes = await fetch(`/api/admin/products/${saved.id}/photos`, { method: 'POST', body: fd })
        if (photoRes.ok) {
          const photo = await photoRes.json() as { r2Key: string }
          mainPhotoKey = photo.r2Key
        }
      }

      setProductList((prev) => [
        { ...saved, categoryName: catName, subcategoryName: subName, brandName: brandName, mainPhotoKey, discountedPrice: null, featured: false },
        ...prev,
      ])
      closeModal()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(product: Product) {
    const newStatus = product.status === 'active' ? 'inactive' : 'active'
    setTogglingId(product.id)

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) return

      setProductList((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      )
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/products/${deleteTarget.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al eliminar')
        return
      }

      setProductList((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="mt-1 text-sm text-gray-500">{productList.length} productos</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Error global */}
      {error && !modalOpen && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 space-y-3">
        {/* Categoría, subcategoría, marca, color, talla, estado */}
        <div className="flex flex-wrap gap-2">
          {/* Estado */}
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as 'all' | 'active' | 'inactive'); setPage(1) }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            <option value="all">Estado</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
          {/* Categoría */}
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setFilterSubcategory(''); setPage(1) }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            <option value="">Categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Subcategoría */}
          <select
            value={filterSubcategory}
            onChange={(e) => { setFilterSubcategory(e.target.value); setPage(1) }}
            disabled={!filterCategory}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <option value="">Subcategoría</option>
            {filterSubcategoryOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Marca */}
          <select
            value={filterBrand}
            onChange={(e) => { setFilterBrand(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
          >
            <option value="">Marca</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Color */}
          {colorOptions.length > 0 && (
            <select
              value={filterColor}
              onChange={(e) => { setFilterColor(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            >
              <option value="">Color</option>
              {colorOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}

          {/* Talla */}
          {sizeOptions.length > 0 && (
            <select
              value={filterSize}
              onChange={(e) => { setFilterSize(e.target.value); setPage(1) }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            >
              <option value="">Talla</option>
              {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}

          {/* Limpiar filtros */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Resultado del filtro */}
        {hasActiveFilters && (
          <p className="text-xs text-gray-400">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'resultado' : 'resultados'}
          </p>
        )}
      </div>

      {/* Tabla */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">
            {filterStatus === 'all' ? 'No hay productos aún.' : `No hay productos ${filterStatus === 'active' ? 'activos' : 'inactivos'}.`}
          </p>
          {filterStatus === 'all' && (
            <button
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-2"
            >
              Crear el primero
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-14" />
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Categoría</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 hidden lg:table-cell">Marca</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 hidden sm:table-cell">Precio base</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 w-28 hidden sm:table-cell">Estado</th>
                  <th className="px-4 py-3 w-20 hidden sm:table-cell" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {/* Miniatura */}
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {product.mainPhotoKey ? (
                          <img
                            src={`/api/media/${product.mainPhotoKey}`}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-gray-900 break-words">{product.name}</p>
                            {product.featured && (
                              <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Destacado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono">{product.slug}</p>
                          {/* Precio + estado + acciones en móvil */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">
                            <span className="text-sm font-medium text-gray-900 tabular-nums">
                              {product.discountedPrice !== null
                                ? MXN.format(product.discountedPrice / 100)
                                : MXN.format(product.basePrice / 100)}
                            </span>
                            <button
                              onClick={() => handleToggleStatus(product)}
                              disabled={togglingId === product.id}
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                                product.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {togglingId === product.id ? '…' : product.status === 'active' ? 'Activo' : 'Inactivo'}
                            </button>
                            <a
                              href={`/admin/productos/${product.id}`}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </a>
                            <button
                              onClick={() => setDeleteTarget(product)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      <p>{product.categoryName ?? '—'}</p>
                      <p className="text-xs text-gray-400">{product.subcategoryName ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{product.brandName ?? '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell">
                      {product.discountedPrice !== null ? (
                        <>
                          <span className="block text-xs text-gray-400 line-through">
                            {MXN.format(product.basePrice / 100)}
                          </span>
                          <span className="block font-medium text-green-700">
                            {MXN.format(product.discountedPrice / 100)}
                          </span>
                        </>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {MXN.format(product.basePrice / 100)}
                        </span>
                      )}
                    </td>
                    {/* Toggle estado */}
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <button
                        onClick={() => handleToggleStatus(product)}
                        disabled={togglingId === product.id}
                        title={product.status === 'active' ? 'Desactivar' : 'Activar'}
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {togglingId === product.id ? '…' : product.status === 'active' ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/admin/productos/${product.id}`}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </a>
                        <button
                          onClick={() => setDeleteTarget(product)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
              <span>
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredProducts.length)} de {filteredProducts.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal crear producto */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative my-8 w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Nuevo producto</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  id="name" name="name" type="text" required autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Ej. Vestido floral manga corta"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  id="description" name="description" rows={3} required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                  placeholder="Descripción del producto…"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select
                    id="categoryId" name="categoryId" required
                    value={selectedCategoryId}
                    onChange={(e) => { setSelectedCategoryId(e.target.value); setSelectedSubcategoryId('') }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="">Seleccionar…</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="subcategoryId" className="block text-sm font-medium text-gray-700 mb-1">Subcategoría</label>
                  <select
                    id="subcategoryId" name="subcategoryId" required
                    value={selectedSubcategoryId}
                    onChange={(e) => setSelectedSubcategoryId(e.target.value)}
                    disabled={!selectedCategoryId}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">Seleccionar…</option>
                    {filteredSubcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="brandId" className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                <select
                  id="brandId" name="brandId" required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="">Seleccionar…</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="basePrice" className="block text-sm font-medium text-gray-700 mb-1">Precio (MXN)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                    <input
                      id="basePrice" name="basePrice" type="number" step="0.01" min="0.01" required
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    id="status" name="status" defaultValue="active"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>
              {/* Foto principal */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto principal <span className="font-normal text-gray-400">(opcional)</span>
                </label>
                {pendingPreview ? (
                  <div className="flex items-start gap-3">
                    <img src={pendingPreview} alt="preview" className="h-20 w-20 rounded-lg object-cover border border-gray-200" />
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => createPhotoRef.current?.click()}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                        Cambiar
                      </button>
                      <button type="button" onClick={clearPendingPhoto}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => createPhotoRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors w-full justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Subir foto
                  </button>
                )}
                <input ref={createPhotoRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={handleCreatePhotoSelect} />
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WEBP o AVIF. Máx. 5 MB.</p>
              </div>

              {/* Sección variantes */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">Variantes</span>
                  <span className="text-xs text-gray-400">(opcional)</span>
                </div>

                {newVariants.length > 0 && (
                  <div className="mb-2 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-500">
                          <th className="pb-1 pr-2 font-medium">Color</th>
                          <th className="pb-1 pr-2 font-medium">Talla</th>
                          <th className="pb-1 pr-2 font-medium">Precio</th>
                          <th className="pb-1 font-medium">Estado</th>
                          <th className="pb-1" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {newVariants.map((v) => (
                          <tr key={v._key}>
                            <td className="py-1 pr-2">
                              <input
                                type="text"
                                value={v.color}
                                onChange={(e) => updateVariantRow(v._key, 'color', e.target.value)}
                                placeholder="Ej. Rojo"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <input
                                type="text"
                                value={v.size}
                                onChange={(e) => updateVariantRow(v._key, 'size', e.target.value)}
                                placeholder="Ej. M"
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={v.priceOverride}
                                  onChange={(e) => updateVariantRow(v._key, 'priceOverride', e.target.value)}
                                  placeholder="Base"
                                  className="w-full rounded border border-gray-300 pl-5 pr-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                                />
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <select
                                value={v.status}
                                onChange={(e) => updateVariantRow(v._key, 'status', e.target.value)}
                                className="rounded border border-gray-300 px-2 py-1 text-xs focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                              >
                                <option value="active">Activo</option>
                                <option value="inactive">Inactivo</option>
                              </select>
                            </td>
                            <td className="py-1">
                              <button
                                type="button"
                                onClick={() => removeVariantRow(v._key)}
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="Eliminar variante"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <button
                  type="button"
                  onClick={addVariantRow}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Agregar variante
                </button>
                {newVariants.length === 0 && (
                  <p className="mt-1 text-xs text-gray-400">Si no agregas variantes, se creará una variante genérica automáticamente.</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button" onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={loading}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <span className="inline-flex items-center gap-2"><Spinner />Guardando…</span> : 'Crear producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Eliminar producto</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <span className="font-medium">"{deleteTarget.name}"</span>? Se eliminarán también todas las fotos. Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? <span className="inline-flex items-center gap-2"><Spinner />Eliminando…</span> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
