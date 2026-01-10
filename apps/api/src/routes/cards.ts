import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@financeiro/database';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// GET /api/cards - Lista todos os cartões
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const cards = await db
    .select()
    .from(schema.creditCards)
    .where(eq(schema.creditCards.familyId, familyId))
    .all();

  return c.json({ success: true, data: cards });
});

// GET /api/cards/:id - Busca um cartão específico
app.get('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();

  const card = await db
    .select()
    .from(schema.creditCards)
    .where(eq(schema.creditCards.id, id))
    .get();

  if (!card) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } }, 404);
  }

  return c.json({ success: true, data: card });
});

// POST /api/cards - Cria um novo cartão
app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const body = await c.req.json();

  const newCard = {
    id: nanoid(),
    familyId,
    ...body,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.creditCards).values(newCard).run();

  return c.json({ success: true, data: newCard }, 201);
});

// PUT /api/cards/:id - Atualiza um cartão
app.put('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();
  const body = await c.req.json();

  const existingCard = await db
    .select()
    .from(schema.creditCards)
    .where(eq(schema.creditCards.id, id))
    .get();

  if (!existingCard) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } }, 404);
  }

  const updated = {
    ...body,
    updatedAt: new Date(),
  };

  await db
    .update(schema.creditCards)
    .set(updated)
    .where(eq(schema.creditCards.id, id))
    .run();

  return c.json({ success: true, data: { id, ...updated } });
});

// DELETE /api/cards/:id - Deleta um cartão (soft delete)
app.delete('/:id', async (c) => {
  const db = drizzle(c.env.DB);
  const { id } = c.req.param();

  const existingCard = await db
    .select()
    .from(schema.creditCards)
    .where(eq(schema.creditCards.id, id))
    .get();

  if (!existingCard) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Card not found' } }, 404);
  }

  await db
    .update(schema.creditCards)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(schema.creditCards.id, id))
    .run();

  return c.json({ success: true, message: 'Card deleted' });
});

export default app;
