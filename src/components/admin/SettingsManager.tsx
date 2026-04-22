import { useState } from 'react'

interface Setting {
  key: string
  value: string | null
  description: string | null
}

// Ajustes conocidos con etiquetas y descripciones para la UI
const KNOWN_SETTINGS: { key: string; label: string; description: string; placeholder?: string; multiline?: boolean }[] = [
  {
    key: 'whatsapp_number',
    label: 'Número de WhatsApp',
    description: 'Número completo con código de país (sin +). Ej: 521XXXXXXXXXX',
    placeholder: '521XXXXXXXXXX',
  },
  {
    key: 'site_name',
    label: 'Nombre del sitio',
    description: 'Nombre de la tienda que aparece en el navegador y enlaces compartidos.',
    placeholder: 'Saris',
  },
  {
    key: 'store_address',
    label: 'Dirección de la tienda',
    description: 'Dirección física visible en el catálogo.',
    placeholder: 'Calle, Ciudad, Estado',
  },
  {
    key: 'store_hours',
    label: 'Horario de atención',
    description: 'Horario de la tienda visible en el catálogo.',
    placeholder: 'Lun–Sáb 10:00–20:00',
    multiline: true,
  },
  {
    key: 'ga_measurement_id',
    label: 'ID de Google Analytics (GA4)',
    description: 'Measurement ID de GA4. Si se configura, se activa el seguimiento automáticamente. Ej: G-XXXXXXXXXX',
    placeholder: 'G-XXXXXXXXXX',
  },
]

interface Props {
  initialSettings: Setting[]
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function SettingsManager({ initialSettings }: Props) {
  // Construir mapa inicial con los valores de la DB
  const buildValues = () => {
    const map: Record<string, string> = {}
    for (const s of initialSettings) {
      map[s.key] = s.value ?? ''
    }
    return map
  }

  const [values, setValues] = useState<Record<string, string>>(buildValues)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const payload = KNOWN_SETTINGS.map(({ key, description }) => ({
        key,
        value: values[key] ?? '',
        description,
      }))

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setError(data.error || 'Error al guardar')
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-2xl space-y-8">
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {KNOWN_SETTINGS.map(({ key, label, description, placeholder, multiline }) => (
          <div key={key} className="px-6 py-5">
            <label className="block mb-1 text-sm font-medium text-gray-900">
              {label}
            </label>
            <p className="text-xs text-gray-500 mb-2">{description}</p>
            {multiline ? (
              <textarea
                rows={3}
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none resize-none"
              />
            ) : (
              <input
                type="text"
                value={values[key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {saving ? <span className="inline-flex items-center gap-2"><Spinner />Guardando…</span> : 'Guardar cambios'}
        </button>
        {success && (
          <span className="text-sm text-green-700 font-medium">Cambios guardados</span>
        )}
      </div>
    </form>
  )
}
