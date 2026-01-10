import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gte, lte } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@financeiro/database';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// GET /api/installments - Lista todas as parcelas
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const { cardId, active, paid, startMonth, endMonth } = c.req.query();

  const conditions = [eq(schema.installments.familyId, familyId)];

  if (cardId) {
    conditions.push(eq(schema.installments.cardId, cardId));
  }

  if (active !== undefined) {
    conditions.push(eq(schema.installments.active, active === 'true'));
  }

  if (paid !== undefined) {
    conditions.push(eq(schema.installments.paid, paid === 'true'));
  }

  if (startMonth) {
    conditions.push(gte(schema.installments.startMonth, startMonth));
  }

  if (endMonth) {
    conditions.push(lte(schema.installments.endMonth, endMonth));
  }

  const installments = await db
    .select()
    .from(schema.installments)
    .where(and(...conditions))
    .all();

  return c.json({ success: true, data: installments });
});

// GET /api/installments/:id - Busca uma parcela específica
app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();

  const installment = await db
    .select()
    .from(schema.installments)
    .where(eq(schema.installments.id, id))
    .get();

  if (!installment) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' } }, 404);
  }

  return c.json({ success: true, data: installment });
});

// POST /api/installments - Cria uma nova parcela
app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const body = await c.req.json();

  const {
    cardId,
    merchant,
    description,
    category,
    installmentValue,
    currentInstallment,
    totalInstallments,
    totalValue,
    startMonth,
    type = 'installment',
  } = body;

  // Calcula o mês de término baseado no total de parcelas
  const start = new Date(startMonth + '-01');
  const end = new Date(start);
  end.setMonth(start.getMonth() + totalInstallments - 1);
  const endMonth = end.toISOString().substring(0, 7);

  const newInstallment = {
    id: nanoid(),
    familyId,
    cardId,
    merchant,
    description,
    category,
    installmentValue,
    currentInstallment,
    totalInstallments,
    totalValue,
    startMonth,
    endMonth,
    type,
    active: true,
    paid: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.installments).values(newInstallment).run();

  return c.json({ success: true, data: newInstallment }, 201);
});

// PUT /api/installments/:id - Atualiza uma parcela
app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();
  const body = await c.req.json();

  const existingInstallment = await db
    .select()
    .from(schema.installments)
    .where(eq(schema.installments.id, id))
    .get();

  if (!existingInstallment) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' } }, 404);
  }

  const updated = {
    ...body,
    updatedAt: new Date(),
  };

  await db
    .update(schema.installments)
    .set(updated)
    .where(eq(schema.installments.id, id))
    .run();

  return c.json({ success: true, data: { id, ...updated } });
});

// DELETE /api/installments/:id - Deleta uma parcela (soft delete)
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();

  const existingInstallment = await db
    .select()
    .from(schema.installments)
    .where(eq(schema.installments.id, id))
    .get();

  if (!existingInstallment) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Installment not found' } }, 404);
  }

  await db
    .update(schema.installments)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.installments.id, id))
    .run();

  return c.json({ success: true, message: 'Installment deleted' });
});

export default app;
