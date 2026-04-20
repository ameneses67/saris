import type { APIRoute } from 'astro'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../db'
import { discounts } from '../../../../db/schema'

export const PUT: APIRoute = async ({ params, request }) => {
  const { id } = params
  const body = await request.json() as {
    label: string
    type: 'percentage' | 'fixed_amount'
    value: number
    scope: 'all' | 'product' | 'category' | 'subcategory' | 'brand' | 'color' | 'size'
    scopeValue?: string
    startDate?: string | null
    endDate?: string | null
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
  if (body.scope !== 'all' && !body.scopeValue?.trim()) {
    return Response.json({ error: 'El valor del alcance es requerido' }, { status: 400 })
  }

  const db = getDb()
  const [updated] = await db
    .update(discounts)
    .set({
      label: body.label.trim(),
      type: body.type,
      value: body.value,
      scope: body.scope,
      scopeValue: body.scope === 'all' ? null : body.scopeValue!.trim(),
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      updatedAt: new Date(),
    })
    .where(eq(discounts.id, id!))
    .returning()

  if (!updated) {
    return Response.json({ error: 'Descuento no encontrado' }, { status: 404 })
  }

  return Response.json(updated)
}

export const PATCH: APIRoute = async ({ params, request }) => {
  const { id } = params
  const body = await request.json() as { active: boolean }

  const db = getDb()
  const [updated] = await db
    .update(discounts)
    .set({ active: body.active, updatedAt: new Date() })
    .where(eq(discounts.id, id!))
    .returning()

  if (!updated) {
    return Response.json({ error: 'Descuento no encontrado' }, { status: 404 })
  }

  return Response.json(updated)
}

export const DELETE: APIRoute = async ({ params }) => {
  const { id } = params
  const db = getDb()

  const [deleted] = await db
    .delete(discounts)
    .where(eq(discounts.id, id!))
    .returning()

  if (!deleted) {
    return Response.json({ error: 'Descuento no encontrado' }, { status: 404 })
  }

  return new Response(null, { status: 204 })
}
