import { useState, useMemo, useRef } from 'react'

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category { id: string; name: string }
interface Subcategory { id: string; categoryId: string; name: string }
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
  featured: boolean
  status: 'active' | 'inactive'
}

interface Photo {
  id: string
  productId: string
  r2Key: string
  altText: string | null
  sortOrder: number
}

interface Variant {
  id: string
  productId: string
  color: string | null
  size: string | null
  priceOverride: number | null
  status: 'active' | 'inactive'
}

interface Props {
  product: Product
  initialPhotos: Photo[]
  initialVariants: Variant[]
  categories: Category[]
  subcategories: Subcategory[]
  brands: Brand[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function centavosToDisplay(centavos: number) {
  return (centavos / 100).toFixed(2)
}

function displayToCentavos(val: string) {
  return Math.round(parseFloat(val) * 100)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ProductDetail({
  product: initialProduct,
  initialPhotos,
  initialVariants,
  categories,
  subcategories,
  brands,
}: Props) {
  // ── Info ──────────────────────────────────────────────────────────────────
  const [product, setProduct] = useState(initialProduct)
  const [infoLoading, setInfoLoading] = useState(false)
  const [infoError, setInfoError] = useState('')
  const [infoSuccess, setInfoSuccess] = useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialProduct.categoryId)
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(initialProduct.subcategoryId)

  const filteredSubcategories = useMemo(
    () => subcategories.filter((s) => s.categoryId === selectedCategoryId),
    [subcategories, selectedCategoryId]
  )

  async function handleInfoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInfoLoading(true)
    setInfoError('')
    setInfoSuccess(false)

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()
    const brandId = (form.elements.namedItem('brandId') as unknown as HTMLSelectElement).value
    const priceDisplay = (form.elements.namedItem('basePrice') as HTMLInputElement).value
    const basePrice = displayToCentavos(priceDisplay)
    const status = (form.elements.namedItem('status') as unknown as HTMLSelectElement).value as 'active' | 'inactive'
    const featured = (form.elements.namedItem('featured') as HTMLInputElement).checked

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          categoryId: selectedCategoryId,
          subcategoryId: selectedSubcategoryId,
          brandId,
          basePrice,
          featured,
          status,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setInfoError(data.error || 'Error al guardar')
        return
      }

      const saved = await res.json() as Product
      const catName = categories.find((c) => c.id === saved.categoryId)?.name ?? null
      const subName = subcategories.find((s) => s.id === saved.subcategoryId)?.name ?? null
      const brandName = brands.find((b) => b.id === saved.brandId)?.name ?? null
      setProduct({ ...saved, categoryName: catName, subcategoryName: subName, brandName: brandName })
      setInfoSuccess(true)
      setTimeout(() => setInfoSuccess(false), 3000)
    } catch {
      setInfoError('Error de conexión')
    } finally {
      setInfoLoading(false)
    }
  }

  // ── Photos ────────────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /** Redimensiona una imagen a max 400 × 533 px (proporción 3:4) usando Canvas */
  async function generateThumb(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const THUMB_W = 400
        const THUMB_H = 533
        const srcRatio = img.width / img.height
        const dstRatio = THUMB_W / THUMB_H
        let sx = 0, sy = 0, sw = img.width, sh = img.height
        if (srcRatio > dstRatio) {
          sw = img.height * dstRatio
          sx = (img.width - sw) / 2
        } else {
          sh = img.width / dstRatio
          sy = (img.height - sh) / 2
        }
        const canvas = document.createElement('canvas')
        canvas.width = THUMB_W
        canvas.height = THUMB_H
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

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    setPhotoError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const thumb = await generateThumb(file)
      formData.append('thumb', thumb, 'thumb.jpg')
    } catch {
      // Si falla el thumbnail, continúa con solo la imagen original
    }

    try {
      const res = await fetch(`/api/admin/products/${product.id}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al subir')
        return
      }

      const photo = await res.json() as Photo
      setPhotos((prev) => [...prev, photo].sort((a, b) => a.sortOrder - b.sortOrder))
    } catch {
      setPhotoError('Error de conexión')
    } finally {
      setUploadLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSetMain(photoId: string) {
    setPhotoError('')
    try {
      const res = await fetch(`/api/admin/products/${product.id}/photos/${photoId}`, {
        method: 'PUT',
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al actualizar')
        return
      }
      // Reload ordering from server state
      const updated = await res.json() as Photo
      setPhotos((prev) => {
        const others = prev
          .filter((p) => p.id !== photoId)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((p, i) => ({ ...p, sortOrder: i + 1 }))
        return [{ ...updated }, ...others].sort((a, b) => a.sortOrder - b.sortOrder)
      })
    } catch {
      setPhotoError('Error de conexión')
    }
  }

  async function handleDeletePhoto(photoId: string) {
    setPhotoError('')
    try {
      const res = await fetch(`/api/admin/products/${product.id}/photos/${photoId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al eliminar')
        return
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {
      setPhotoError('Error de conexión')
    }
  }

  // ── Variants ──────────────────────────────────────────────────────────────
  const [variants, setVariants] = useState<Variant[]>(initialVariants)
  const [variantError, setVariantError] = useState('')
  const [variantLoading, setVariantLoading] = useState(false)
  const [editVariant, setEditVariant] = useState<Variant | null>(null)
  const [deleteVariant, setDeleteVariant] = useState<Variant | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  async function handleAddVariant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setVariantLoading(true)
    setVariantError('')

    const form = e.currentTarget
    const color = (form.elements.namedItem('color') as HTMLInputElement).value.trim()
    const size = (form.elements.namedItem('size') as HTMLInputElement).value.trim()
    const priceStr = (form.elements.namedItem('priceOverride') as HTMLInputElement).value
    const priceOverride = priceStr ? displayToCentavos(priceStr) : null
    const status = (form.elements.namedItem('variantStatus') as unknown as HTMLSelectElement).value as 'active' | 'inactive'

    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: color || undefined, size: size || undefined, priceOverride, status }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setVariantError(data.error || 'Error al guardar')
        return
      }

      const variant = await res.json() as Variant
      setVariants((prev) => [...prev, variant])
      form.reset()
      setShowAddForm(false)
    } catch {
      setVariantError('Error de conexión')
    } finally {
      setVariantLoading(false)
    }
  }

  async function handleEditVariant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editVariant) return
    setVariantLoading(true)
    setVariantError('')

    const form = e.currentTarget
    const color = (form.elements.namedItem('color') as HTMLInputElement).value.trim()
    const size = (form.elements.namedItem('size') as HTMLInputElement).value.trim()
    const priceStr = (form.elements.namedItem('priceOverride') as HTMLInputElement).value
    const priceOverride = priceStr ? displayToCentavos(priceStr) : null
    const status = (form.elements.namedItem('variantStatus') as unknown as HTMLSelectElement).value as 'active' | 'inactive'

    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants/${editVariant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: color || undefined, size: size || undefined, priceOverride, status }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setVariantError(data.error || 'Error al guardar')
        return
      }

      const updated = await res.json() as Variant
      setVariants((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
      setEditVariant(null)
    } catch {
      setVariantError('Error de conexión')
    } finally {
      setVariantLoading(false)
    }
  }

  async function handleDeleteVariant() {
    if (!deleteVariant) return
    setVariantLoading(true)
    setVariantError('')

    try {
      const res = await fetch(`/api/admin/products/${product.id}/variants/${deleteVariant.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setVariantError(data.error || 'Error al eliminar')
        return
      }

      setVariants((prev) => prev.filter((v) => v.id !== deleteVariant.id))
      setDeleteVariant(null)
    } catch {
      setVariantError('Error de conexión')
    } finally {
      setVariantLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <a href="/admin/productos" className="hover:text-gray-900 transition-colors">Productos</a>
        <span>/</span>
        <span className="text-gray-900 font-medium break-words">{product.name}</span>
      </div>

      {/* ── Sección: Información básica ─────────────────────────────────── */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Información básica</h2>
        </div>
        <form onSubmit={handleInfoSubmit} className="p-6 space-y-4">
          {infoError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {infoError}
            </div>
          )}
          {infoSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Cambios guardados correctamente.
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              id="name" name="name" type="text"
              defaultValue={product.name}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              id="description" name="description" rows={3}
              defaultValue={product.description}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
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
              defaultValue={product.brandId}
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
                  id="basePrice" name="basePrice" type="number" step="0.01" min="0.01"
                  defaultValue={centavosToDisplay(product.basePrice)}
                  required
                  className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                id="status" name="status"
                defaultValue={product.status}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              id="featured"
              name="featured"
              type="checkbox"
              defaultChecked={product.featured}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <div>
              <span className="text-sm font-medium text-gray-700">Producto destacado</span>
              <p className="text-xs text-gray-400">Aparece en la sección de destacados del homepage</p>
            </div>
          </label>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400 font-mono">slug: {product.slug}</p>
            <button
              type="submit" disabled={infoLoading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {infoLoading ? <span className="inline-flex items-center gap-2"><Spinner />Guardando…</span> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Sección: Fotos ───────────────────────────────────────────────── */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Fotos</h2>
            <p className="text-xs text-gray-400 mt-0.5">La primera foto es la imagen principal del producto</p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading || photos.length >= 3}
            title={photos.length >= 3 ? 'Máximo 3 fotos por producto' : undefined}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadLoading ? <span className="inline-flex items-center gap-2"><Spinner />Subiendo…</span> : photos.length >= 3 ? 'Máx. 3 fotos' : '+ Subir foto'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
        <div className="p-6">
          {photoError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {photoError}
            </div>
          )}

          {photos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
              <p className="text-sm text-gray-400">Sin fotos. Sube la primera imagen.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className={`group relative overflow-hidden rounded-lg border-2 bg-gray-100 aspect-square ${
                    idx === 0 ? 'border-gray-900' : 'border-transparent'
                  }`}
                >
                  <img
                    src={`/api/media/${photo.r2Key}`}
                    alt={photo.altText ?? product.name}
                    className="h-full w-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-gray-900 px-1.5 py-0.5 text-xs font-medium text-white">
                      Principal
                    </span>
                  )}
                  {/* Overlay de acciones */}
                  <div className="absolute inset-0 flex items-end justify-center gap-1.5 bg-black/0 p-2 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
                    {idx !== 0 && (
                      <button
                        onClick={() => handleSetMain(photo.id)}
                        className="rounded bg-white px-2 py-1 text-xs font-medium text-gray-900 shadow hover:bg-gray-100 transition-colors"
                        title="Hacer principal"
                      >
                        Principal
                      </button>
                    )}
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="rounded bg-red-600 p-1 text-white shadow hover:bg-red-700 transition-colors"
                      title="Eliminar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Sección: Variantes ───────────────────────────────────────────── */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Variantes</h2>
            <p className="text-xs text-gray-400 mt-0.5">Combinaciones de color, talla o precio especial</p>
          </div>
          <button
            onClick={() => { setShowAddForm(true); setVariantError('') }}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          >
            + Agregar
          </button>
        </div>
        <div className="p-6">
          {variantError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {variantError}
            </div>
          )}

          {variants.length === 0 && !showAddForm ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
              <p className="text-sm text-gray-400">Sin variantes. El producto se vende en una sola presentación.</p>
            </div>
          ) : (
            <>
              {variants.length > 0 && (
                <div className="overflow-hidden rounded-lg border border-gray-200 mb-4">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200 bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Color</th>
                        <th className="px-4 py-2.5 text-left font-medium text-gray-600">Talla</th>
                        <th className="px-4 py-2.5 text-right font-medium text-gray-600">Precio</th>
                        <th className="px-4 py-2.5 text-center font-medium text-gray-600 w-20">Estado</th>
                        <th className="px-4 py-2.5 w-20" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {variants.map((v) => (
                        <tr key={v.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-900">{v.color ?? <span className="text-gray-400">—</span>}</td>
                          <td className="px-4 py-2.5 text-gray-900">{v.size ?? <span className="text-gray-400">—</span>}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {v.priceOverride != null
                              ? <span className="font-medium text-gray-900">{MXN.format(v.priceOverride / 100)}</span>
                              : <span className="text-gray-400 text-xs">Base</span>
                            }
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {v.status === 'active' ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setEditVariant(v); setVariantError('') }}
                                className="text-gray-400 hover:text-gray-700 transition-colors"
                                title="Editar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setDeleteVariant(v)}
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
              )}
            </>
          )}

          {/* Form agregar variante */}
          {showAddForm && (
            <VariantForm
              onSubmit={handleAddVariant}
              onCancel={() => setShowAddForm(false)}
              loading={variantLoading}
              basePrice={product.basePrice}
            />
          )}
        </div>
      </section>

      {/* Modal editar variante */}
      {editVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditVariant(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Editar variante</h3>
            </div>
            <form onSubmit={handleEditVariant} className="p-6">
              {variantError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {variantError}
                </div>
              )}
              <VariantFields
                defaultColor={editVariant.color ?? ''}
                defaultSize={editVariant.size ?? ''}
                defaultPriceOverride={editVariant.priceOverride != null ? centavosToDisplay(editVariant.priceOverride) : ''}
                defaultStatus={editVariant.status}
                basePrice={product.basePrice}
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setEditVariant(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={variantLoading}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {variantLoading ? <span className="inline-flex items-center gap-2"><Spinner />Guardando…</span> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar variante */}
      {deleteVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteVariant(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Eliminar variante</h3>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar la variante
              {deleteVariant.color && <> <span className="font-medium">{deleteVariant.color}</span></>}
              {deleteVariant.size && <> / <span className="font-medium">{deleteVariant.size}</span></>}
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteVariant(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteVariant}
                disabled={variantLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {variantLoading ? <span className="inline-flex items-center gap-2"><Spinner />Eliminando…</span> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface VariantFormProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  loading: boolean
  basePrice: number
}

function VariantForm({ onSubmit, onCancel, loading, basePrice }: VariantFormProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-medium text-gray-600 mb-3 uppercase tracking-wide">Nueva variante</p>
      <form onSubmit={onSubmit}>
        <VariantFields basePrice={basePrice} />
        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button" onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit" disabled={loading}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <span className="inline-flex items-center gap-2"><Spinner />Guardando…</span> : 'Agregar'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface VariantFieldsProps {
  defaultColor?: string
  defaultSize?: string
  defaultPriceOverride?: string
  defaultStatus?: 'active' | 'inactive'
  basePrice: number
}

function VariantFields({
  defaultColor = '',
  defaultSize = '',
  defaultPriceOverride = '',
  defaultStatus = 'active',
  basePrice,
}: VariantFieldsProps) {
  const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="color" className="block text-xs font-medium text-gray-600 mb-1">Color</label>
          <input
            id="color" name="color" type="text"
            defaultValue={defaultColor}
            placeholder="Ej. Rojo, Azul marino"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
        <div>
          <label htmlFor="size" className="block text-xs font-medium text-gray-600 mb-1">Talla / Tamaño</label>
          <input
            id="size" name="size" type="text"
            defaultValue={defaultSize}
            placeholder="Ej. M, XL, 32"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="priceOverride" className="block text-xs font-medium text-gray-600 mb-1">
            Precio especial
            <span className="ml-1 text-gray-400 font-normal">(vacío = {MXN.format(basePrice / 100)})</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input
              id="priceOverride" name="priceOverride" type="number" step="0.01" min="0.01"
              defaultValue={defaultPriceOverride}
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>
        </div>
        <div>
          <label htmlFor="variantStatus" className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select
            id="variantStatus" name="variantStatus"
            defaultValue={defaultStatus}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
    </div>
  )
}
