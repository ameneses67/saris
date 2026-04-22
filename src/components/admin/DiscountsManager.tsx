import { useState } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type DiscountType = 'percentage' | 'fixed_amount'
type DiscountScope = 'all' | 'product' | 'category' | 'subcategory' | 'brand' | 'color' | 'size'

interface Discount {
  id: string
  label: string
  type: DiscountType
  value: number
  scope: DiscountScope
  scopeValue: string | null
  startDate: number | null
  endDate: number | null
  active: boolean
  createdAt: number
}

interface ScopeOption {
  id: string
  name: string
}

interface Props {
  initialDiscounts: Discount[]
  categories: ScopeOption[]
  subcategories: ScopeOption[]
  brands: ScopeOption[]
  products: ScopeOption[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDiscountStatus(d: Discount): { label: string; color: string } {
  const now = Date.now()
  if (!d.active) return { label: 'Desactivado', color: 'text-gray-400 bg-gray-100' }
  if (d.startDate && d.startDate > now) return { label: 'Programado', color: 'text-blue-700 bg-blue-50' }
  if (d.endDate && d.endDate + 86_400_000 <= now) return { label: 'Expirado', color: 'text-orange-700 bg-orange-50' }
  return { label: 'Activo', color: 'text-green-700 bg-green-50' }
}

function formatValue(type: DiscountType, value: number): string {
  if (type === 'percentage') return `${value}%`
  return `$${(value / 100).toFixed(2)}`
}

function formatDate(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

function toInputDate(ts: number | null): string {
  if (!ts) return ''
  return new Date(ts).toISOString().slice(0, 10)
}

const SCOPE_LABELS: Record<DiscountScope, string> = {
  all: 'Todos',
  product: 'Producto',
  category: 'Categoría',
  subcategory: 'Subcategoría',
  brand: 'Marca',
  color: 'Color',
  size: 'Talla',
}

// ─── Estado inicial del formulario ───────────────────────────────────────────

interface FormState {
  label: string
  type: DiscountType
  value: string
  scope: DiscountScope
  scopeValue: string
  startDate: string
  endDate: string
}

function emptyForm(): FormState {
  return { label: '', type: 'percentage', value: '', scope: 'all', scopeValue: '', startDate: '', endDate: '' }
}

function discountToForm(d: Discount): FormState {
  return {
    label: d.label,
    type: d.type,
    value: d.type === 'fixed_amount' ? String(d.value / 100) : String(d.value),
    scope: d.scope,
    scopeValue: d.scopeValue ?? '',
    startDate: toInputDate(d.startDate),
    endDate: toInputDate(d.endDate),
  }
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DiscountsManager({
  initialDiscounts,
  categories,
  subcategories,
  brands,
  products,
}: Props) {
  const [discountsList, setDiscountsList] = useState<Discount[]>(initialDiscounts)
  const [editTarget, setEditTarget] = useState<Discount | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Helpers de formulario ──────────────────────────────────────────────────

  function openCreate() {
    setError('')
    setEditTarget(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  function openEdit(d: Discount) {
    setError('')
    setEditTarget(d)
    setForm(discountToForm(d))
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditTarget(null)
    setError('')
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Cuando cambia el scope, limpiar scopeValue
  function handleScopeChange(scope: DiscountScope) {
    setForm((prev) => ({ ...prev, scope, scopeValue: '' }))
  }

  // ── Selector dinámico de scopeValue ───────────────────────────────────────

  function ScopeValueField() {
    const { scope, scopeValue } = form

    if (scope === 'all') return null

    const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900'

    if (scope === 'color' || scope === 'size') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {scope === 'color' ? 'Color' : 'Talla'}
          </label>
          <input
            type="text"
            value={scopeValue}
            onChange={(e) => setField('scopeValue', e.target.value)}
            required
            className={inputCls}
            placeholder={scope === 'color' ? 'Ej. Rojo' : 'Ej. M'}
          />
        </div>
      )
    }

    const optionsMap: Record<string, ScopeOption[]> = {
      category: categories,
      subcategory: subcategories,
      brand: brands,
      product: products,
    }
    const options = optionsMap[scope] ?? []

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {SCOPE_LABELS[scope]}
        </label>
        <select
          value={scopeValue}
          onChange={(e) => setField('scopeValue', e.target.value)}
          required
          className={inputCls}
        >
          <option value="">Seleccionar…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>
    )
  }

  // ── Guardar ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Convertir valor: fixed_amount → centavos; percentage → entero
    const numericValue = parseFloat(form.value)
    const valueInCents = form.type === 'fixed_amount'
      ? Math.round(numericValue * 100)
      : Math.round(numericValue)

    const payload = {
      label: form.label,
      type: form.type,
      value: valueInCents,
      scope: form.scope,
      scopeValue: form.scope === 'all' ? undefined : form.scopeValue || undefined,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    }

    const isEdit = !!editTarget
    const url = isEdit ? `/api/admin/discounts/${editTarget!.id}` : '/api/admin/discounts'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al guardar')
        return
      }

      const saved: Discount = await res.json()

      if (isEdit) {
        setDiscountsList((prev) => prev.map((d) => (d.id === saved.id ? saved : d)))
      } else {
        setDiscountsList((prev) => [saved, ...prev])
      }

      closeForm()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle activo ──────────────────────────────────────────────────────────

  async function handleToggleActive(d: Discount) {
    try {
      const res = await fetch(`/api/admin/discounts/${d.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !d.active }),
      })

      if (!res.ok) return

      const updated: Discount = await res.json()
      setDiscountsList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch {
      // silencioso
    }
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/discounts/${deleteTarget.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al eliminar')
        return
      }

      setDiscountsList((prev) => prev.filter((d) => d.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900'

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Descuentos</h1>
          <p className="mt-1 text-sm text-gray-500">{discountsList.length} descuentos</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nuevo descuento
        </button>
      </div>

      {/* Error global */}
      {error && !showForm && !deleteTarget && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      {discountsList.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No hay descuentos aún.</p>
          <button
            onClick={openCreate}
            className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-2"
          >
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Alcance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Valor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Inicio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fin</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {discountsList.map((d) => {
                const status = getDiscountStatus(d)
                return (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.label}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span>{SCOPE_LABELS[d.scope]}</span>
                      {d.scopeValue && (
                        <span className="ml-1 text-gray-400 text-xs">({d.scopeValue})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {d.type === 'percentage' ? 'Porcentaje' : 'Monto fijo'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-gray-900">
                      {formatValue(d.type, d.value)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(d.startDate)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(d.endDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle activo */}
                        <button
                          onClick={() => handleToggleActive(d)}
                          title={d.active ? 'Desactivar' : 'Activar'}
                          className={`transition-colors ${d.active ? 'text-green-500 hover:text-gray-400' : 'text-gray-300 hover:text-green-500'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </button>
                        {/* Editar */}
                        <button
                          onClick={() => openEdit(d)}
                          className="text-gray-400 hover:text-gray-700 transition-colors"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        {/* Eliminar */}
                        <button
                          onClick={() => setDeleteTarget(d)}
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear/editar */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeForm} />
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {editTarget ? 'Editar descuento' : 'Nuevo descuento'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del descuento
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setField('label', e.target.value)}
                  required
                  autoFocus
                  className={inputCls}
                  placeholder="Ej. Temporada de verano"
                />
              </div>

              {/* Tipo + Valor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setField('type', e.target.value as DiscountType)}
                    className={inputCls}
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed_amount">Monto fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.type === 'percentage' ? 'Porcentaje' : 'Monto ($)'}
                  </label>
                  <input
                    type="number"
                    value={form.value}
                    onChange={(e) => setField('value', e.target.value)}
                    required
                    min={form.type === 'percentage' ? 1 : 0.01}
                    max={form.type === 'percentage' ? 100 : undefined}
                    step={form.type === 'percentage' ? 1 : 0.01}
                    className={inputCls}
                    placeholder={form.type === 'percentage' ? 'Ej. 20' : 'Ej. 50.00'}
                  />
                </div>
              </div>

              {/* Alcance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alcance</label>
                <select
                  value={form.scope}
                  onChange={(e) => handleScopeChange(e.target.value as DiscountScope)}
                  className={inputCls}
                >
                  <option value="all">Todos los productos</option>
                  <option value="product">Producto específico</option>
                  <option value="category">Categoría</option>
                  <option value="subcategory">Subcategoría</option>
                  <option value="brand">Marca</option>
                  <option value="color">Color</option>
                  <option value="size">Talla</option>
                </select>
              </div>

              {/* Selector dinámico de scopeValue */}
              <ScopeValueField />

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de inicio <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setField('startDate', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de fin <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setField('endDate', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
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
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Eliminar descuento</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar <span className="font-medium">"{deleteTarget.label}"</span>? Esta acción no se puede deshacer.
            </p>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setError('') }}
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
