import type { APIRoute } from 'astro'
import { and, asc, desc, gte, lte, or, isNull } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { discounts } from '../../../../db/schema'

export const GET: APIRoute = async () => {
  const db = getDb()
  const rows = await db
    .select()
    .from(discounts)
    .orderBy(desc(discounts.createdAt))
  return Response.json(rows)
}

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json() as {
    label: string
    type: 'percentage' | 'fixed_amount'
    value: number
    scope: 'all' | 'product' | 'category' | 'subcategory' | 'brand' | 'color' | 'size'
    scopeValue?: string
    startDate?: string
    endDate?: string
  }

  if (!body.label?.trim()) {
    return Response.json({ error: 'El nombre es requerido' }, { status: 400 })
  }
  if (!body.type || !['percentage', 'fixed_amount'].includes(body.type)) {
    return Response.json({ error: 'Tipo inválido' }, { status: 400 })
  }
  if (!body.value || body.value <= 0) {
    return Response.json({ error: 'El valor debe ser mayor a 0' }, { status: 400 })
  }
  if (body.type === 'percentage' && body.value > 100) {
    return Response.json({ error: 'El porcentaje no puede ser mayor a 100' }, { status: 400 })
  }
  if (!body.scope) {
    return Response.json({ error: 'El alcance es requerido' }, { status: 400 })
  }
  if (body.scope !== 'all' && !body.scopeValue?.trim()) {
    return Response.json({ error: 'El valor del alcance es requerido' }, { status: 400 })
  }

  const db = getDb()
  const [discount] = await db
    .insert(discounts)
    .values({
      id: crypto.randomUUID(),
      label: body.label.trim(),
      type: body.type,
      value: body.value,
      scope: body.scope,
      scopeValue: body.scope === 'all' ? null : body.scopeValue!.trim(),
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      active: true,
    })
    .returning()

  return Response.json(discount, { status: 201 })
}
