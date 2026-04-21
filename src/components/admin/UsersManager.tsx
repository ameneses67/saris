import { useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'editor'
  createdAt: string | number | Date
}

interface Props {
  initialUsers: User[]
  currentUserId: string
}

interface ModalState {
  open: boolean
  user: User | null
}

export default function UsersManager({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [modal, setModal] = useState<ModalState>({ open: false, user: null })
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function openCreate() {
    setError('')
    setShowPassword(false)
    setModal({ open: true, user: null })
  }

  function openEdit(u: User) {
    setError('')
    setShowPassword(false)
    setModal({ open: true, user: u })
  }

  function closeModal() {
    setModal({ open: false, user: null })
    setError('')
    setShowPassword(false)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value?.trim()
    const role = ((form.elements.namedItem('role') as unknown) as HTMLSelectElement).value as 'admin' | 'editor'
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value?.trim()

    const isEdit = !!modal.user

    try {
      let res: Response
      if (isEdit) {
        const body: Record<string, string> = { name, role }
        if (password) body.password = password
        res = await fetch(`/api/admin/users/${modal.user!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        })
      }

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al guardar')
        return
      }

      const saved: User = await res.json()

      if (isEdit) {
        setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)))
      } else {
        setUsers((prev) => [...prev, saved])
      }

      closeModal()
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error || 'Error al eliminar')
        setDeleteTarget(null)
        return
      }

      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(ts: string | number | Date) {
    return new Date(ts as string).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="mt-1 text-sm text-gray-500">{users.length} {users.length === 1 ? 'usuario' : 'usuarios'}</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Error global */}
      {error && !modal.open && !deleteTarget && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabla */}
      {users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-gray-500">No hay usuarios.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-28">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-36 hidden sm:table-cell">Creado</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-2 text-xs text-gray-400">(tú)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.role === 'admin'
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : 'Editor'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="text-gray-400 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Eliminar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">
                {modal.user ? 'Editar usuario' : 'Nuevo usuario'}
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
                  defaultValue={modal.user?.name ?? ''}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder="Nombre completo"
                />
              </div>

              {!modal.user && (
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              )}

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue={modal.user?.role ?? 'editor'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  {modal.user?.role === 'admin' || !modal.user
                    ? 'Los administradores pueden gestionar usuarios y configuración.'
                    : 'Los editores pueden gestionar productos, categorías y descuentos.'}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    {modal.user ? 'Nueva contraseña' : 'Contraseña'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required={!modal.user}
                  minLength={8}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  placeholder={modal.user ? 'Dejar en blanco para no cambiar' : 'Mínimo 8 caracteres'}
                />
                {!modal.user && (
                  <p className="mt-1 text-xs text-gray-400">Mínimo 8 caracteres.</p>
                )}
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
          </div>
        </div>
      )}

      {/* Modal confirmar eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">Eliminar usuario</h2>
            <p className="text-sm text-gray-600 mb-6">
              ¿Eliminar a <span className="font-medium">"{deleteTarget.name}"</span>? Se eliminarán también sus sesiones activas. Esta acción no se puede deshacer.
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
