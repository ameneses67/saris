import { useState, useRef } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  photoKey: string | null
  sortOrder: number
}

interface Props {
  initialCategories: Category[]
}

interface ModalState {
  open: boolean
  category: Category | null
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [modal, setModal] = useState<ModalState>({ open: false, category: null })
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function openCreate() {
    setError('')
    setPhotoError('')
    setModal({ open: true, category: null })
  }

  function openEdit(category: Category) {
    setError('')
    setPhotoError('')
    setModal({ open: true, category })
  }

  function closeModal() {
    setModal({ open: false, category: null })
    setError('')
    setPhotoError('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value.trim()
    const sortOrder = parseInt((form.elements.namedItem('sortOrder') as HTMLInputElement).value) || 0

    const isEdit = !!modal.category
    const url = isEdit
      ? `/api/admin/categories/${modal.category!.id}`
      : '/api/admin/categories'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || null, sortOrder }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al guardar')
        return
      }

      const saved: Category = await res.json()

      if (isEdit) {
        setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
      } else {
        setCategories((prev) =>
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
    if (!file || !modal.category) return

    setPhotoLoading(true)
    setPhotoError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`/api/admin/categories/${modal.category.id}/photo`, {
        method: 'PUT',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al subir')
        return
      }

      const updated: Category = await res.json()
      setModal({ open: true, category: updated })
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch {
      setPhotoError('Error de conexión')
    } finally {
      setPhotoLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePhotoDelete() {
    if (!modal.category) return
    setPhotoLoading(true)
    setPhotoError('')

    try {
      const res = await fetch(`/api/admin/categories/${modal.category.id}/photo`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setPhotoError(data.error || 'Error al eliminar')
        return
      }

      const updated: Category = await res.json()
      setModal({ open: true, category: updated })
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
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
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al eliminar')
        return
      }

      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id))
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
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="mt-1 text-sm text-gray-500">{categories.length} categorías</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nueva categoría
        </button>
      </div>

      {/* Error global */}
      {error && !modal.open && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      {categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No hay categorías aún.</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-2"
          >
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 w-12" />
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 hidden md:table-cell">Slug</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600 w-20 hidden sm:table-cell">Orden</th>
                <th className="px-4 py-3 w-24 hidden sm:table-cell" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      {category.photoKey ? (
                        <img
                          src={`/api/media/${category.photoKey}`}
                          alt={category.name}
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
                    <p className="font-medium text-gray-900 break-words">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-gray-400 break-words">{category.description}</p>
                    )}
                    {/* Acciones en móvil */}
                    <div className="mt-1.5 flex items-center gap-1 sm:hidden">
                      <button
                        onClick={() => openEdit(category)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(category)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">{category.slug}</td>
                  <td className="px-4 py-3 text-center text-gray-500 hidden sm:table-cell">{category.sortOrder}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(category)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(category)}
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

      {/* Modal crear/editar */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative my-8 w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.category ? 'Editar categoría' : 'Nueva categoría'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={modal.category?.name ?? ''}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Ej. Ropa de mujer"
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
                  defaultValue={modal.category?.description ?? ''}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
                  placeholder="Descripción breve de la categoría…"
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
                  defaultValue={modal.category?.sortOrder ?? 0}
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
                  {loading ? <span className="inline-flex items-center gap-2"><Spinner />Guardando…</span> : 'Guardar'}
                </button>
              </div>
            </form>

            {/* Foto — solo disponible en modo edición (necesitamos el ID) */}
            {modal.category && (
              <div className="border-t border-gray-200 px-6 py-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Foto representativa</p>
                {photoError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {photoError}
                  </div>
                )}
                {modal.category.photoKey ? (
                  <div className="flex items-start gap-3">
                    <img
                      src={`/api/media/${modal.category.photoKey}`}
                      alt={modal.category.name}
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
            <h2 className="text-base font-semibold text-gray-900 mb-2">Eliminar categoría</h2>
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
                {loading ? <span className="inline-flex items-center gap-2"><Spinner />Eliminando…</span> : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
