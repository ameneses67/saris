import { useState, useRef } from 'react'

interface Category {
  id: string
  name: string
}

interface Subcategory {
  id: string
  name: string
  slug: string
  categoryId: string
  description: string | null
  photoKey: string | null
  sortOrder: number
}

interface Props {
  initialSubcategories: Subcategory[]
  categories: Category[]
}

interface ModalState {
  open: boolean
  subcategory: Subcategory | null
}

export default function SubcategoriesManager({ initialSubcategories, categories }: Props) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>(initialSubcategories)
  const [modal, setModal] = useState<ModalState>({ open: false, subcategory: null })
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openCreate() {
    setError('')
    setPhotoError('')
    setModal({ open: true, subcategory: null })
  }

  function openEdit(subcategory: Subcategory) {
    setError('')
    setPhotoError('')
    setModal({ open: true, subcategory })
  }

  function closeModal() {
    setModal({ open: false, subcategory: null })
    setError('')
    setPhotoError('')
  }

  function getCategoryName(categoryId: string) {
    return categories.find((c) => c.id === categoryId)?.name ?? '—'
  }

  // Agrupar subcategorías por categoría
  const grouped = categories
    .map((category) => ({
      category,
      subcategories: subcategories.filter((s) => s.categoryId === category.id),
    }))
    .filter((g) => g.subcategories.length > 0)

  const ungrouped = subcategories.filter(
    (s) => !categories.find((c) => c.id === s.categoryId)
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const categoryId = (form.elements.namedItem('categoryId') as unknown as HTMLSelectElement).value
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()
    const sortOrder = parseInt((form.elements.namedItem('sortOrder') as HTMLInputElement).value) || 0

    const isEdit = !!modal.subcategory
    const url = isEdit
      ? `/api/admin/subcategories/${modal.subcategory!.id}`
      : '/api/admin/subcategories'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, categoryId, description: description || null, sortOrder }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al guardar')
        return
      }

      const saved: Subcategory = await res.json()

      if (isEdit) {
        setSubcategories((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))
      } else {
        setSubcategories((prev) =>
          [...prev, saved].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
        )
      }

      closeModal()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !modal.subcategory) return

    setPhotoLoading(true)
    setPhotoError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/subcategories/${modal.subcategory.id}/photo`, {
        method: 'PUT',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al subir')
        return
      }

      const updated: Subcategory = await res.json()
      setModal({ open: true, subcategory: updated })
      setSubcategories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      setPhotoError('Error de conexión')
    } finally {
      setPhotoLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePhotoDelete() {
    if (!modal.subcategory) return
    setPhotoLoading(true)
    setPhotoError('')

    try {
      const res = await fetch(`/api/admin/subcategories/${modal.subcategory.id}/photo`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al eliminar')
        return
      }

      const updated: Subcategory = await res.json()
      setModal({ open: true, subcategory: updated })
      setSubcategories((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
    } catch {
      setPhotoError('Error de conexión')
    } finally {
      setPhotoLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/subcategories/${deleteTarget.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al eliminar')
        return
      }

      setSubcategories((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcategorías</h1>
          <p className="mt-1 text-sm text-gray-500">{subcategories.length} subcategorías</p>
        </div>
        <button
          onClick={openCreate}
          disabled={categories.length === 0}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={categories.length === 0 ? 'Primero crea una categoría' : undefined}
        >
          + Nueva subcategoría
        </button>
      </div>

      {categories.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Primero debes crear al menos una categoría antes de agregar subcategorías.
        </div>
      )}

      {/* Error global */}
      {error && !modal.open && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla agrupada por categoría */}
      {subcategories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No hay subcategorías aún.</p>
          {categories.length > 0 && (
            <button
              onClick={openCreate}
              className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-2"
            >
              Crear la primera
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, subcategories: subs }) => (
            <div key={category.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {category.name}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {subs.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 w-12">
                        {sub.photoKey ? (
                          <img
                            src={`/api/media/${sub.photoKey}`}
                            alt={sub.name}
                            className="h-10 w-10 rounded-md object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{sub.name}</p>
                        {sub.description && (
                          <p className="text-xs text-gray-400 truncate max-w-xs">{sub.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{sub.slug}</td>
                      <td className="px-4 py-3 text-center text-gray-500 w-20">{sub.sortOrder}</td>
                      <td className="px-4 py-3 w-24">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(sub)}
                            className="text-gray-400 hover:text-gray-700 transition-colors"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(sub)}
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
          ))}

          {/* Subcategorías huérfanas (categoría eliminada) */}
          {ungrouped.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-amber-200 bg-white">
              <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Sin categoría
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-gray-100">
                  {ungrouped.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{sub.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{sub.slug}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{getCategoryName(sub.categoryId)}</td>
                      <td className="px-4 py-3 w-24">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(sub)} className="text-gray-400 hover:text-gray-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(sub)} className="text-gray-400 hover:text-red-600 transition-colors">
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
        </div>
      )}

      {/* Modal crear/editar */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative my-8 w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.subcategory ? 'Editar subcategoría' : 'Nueva subcategoría'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  id="categoryId"
                  name="categoryId"
                  defaultValue={modal.subcategory?.categoryId ?? ''}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="" disabled>Selecciona una categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={modal.subcategory?.name ?? ''}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Ej. Blusas"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  defaultValue={modal.subcategory?.description ?? ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                  placeholder="Descripción breve de la subcategoría…"
                />
              </div>
              <div>
                <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
                  Orden
                </label>
                <input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  defaultValue={modal.subcategory?.sortOrder ?? 0}
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
                <p className="mt-1 text-xs text-gray-400">Número menor = aparece primero</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>

            {/* Foto — solo disponible en modo edición */}
            {modal.subcategory && (
              <div className="border-t border-gray-200 px-6 py-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Foto representativa</p>
                {photoError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {photoError}
                  </div>
                )}
                {modal.subcategory.photoKey ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={`/api/media/${modal.subcategory.photoKey}`}
                      alt={modal.subcategory.name}
                      className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoLoading}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {photoLoading ? 'Subiendo…' : 'Reemplazar'}
                      </button>
                      <button
                        type="button"
                        onClick={handlePhotoDelete}
                        disabled={photoLoading}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        Eliminar foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoLoading}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 disabled:opacity-50 transition-colors w-full justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {photoLoading ? 'Subiendo…' : 'Subir foto'}
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <p className="mt-2 text-xs text-gray-400">JPG, PNG, WEBP o AVIF. Máx. 5 MB.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Eliminar subcategoría</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <span className="font-medium">"{deleteTarget.name}"</span>? Esta acción no se puede deshacer.
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
                {loading ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
