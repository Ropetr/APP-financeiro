import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@financeiro/database';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Despesas Fixas
app.get('/fixed', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1';

  const expenses = await db
    .select()
    .from(schema.fixedExpenses)
    .where(eq(schema.fixedExpenses.familyId, familyId))
    .all();

  return c.json({ success: true, data: expenses });
});

app.post('/fixed', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1';
  const body = await c.req.json();

  const newExpense = {
    id: nanoid(),
    familyId,
    ...body,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.fixedExpenses).values(newExpense).run();

  return c.json({ success: true, data: newExpense }, 201);
});

// Despesas Variáveis
app.get('/variable', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1';

  const expenses = await db
    .select()
    .from(schema.variableExpenses)
    .where(eq(schema.variableExpenses.familyId, familyId))
    .all();

  return c.json({ success: true, data: expenses });
});

app.post('/variable', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1';
  const body = await c.req.json();

  const newExpense = {
    id: nanoid(),
    familyId,
    ...body,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.variableExpenses).values(newExpense).run();

  return c.json({ success: true, data: newExpense }, 201);
});

export default app;
