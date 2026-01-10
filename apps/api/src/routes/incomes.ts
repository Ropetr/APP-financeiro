import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@financeiro/database';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1';

  const incomes = await db
    .select()
    .from(schema.incomes)
    .where(eq(schema.incomes.familyId, familyId))
    .all();

  return c.json({ success: true, data: incomes });
});

app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1';
  const body = await c.req.json();

  const newIncome = {
    id: nanoid(),
    familyId,
    ...body,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.incomes).values(newIncome).run();

  return c.json({ success: true, data: newIncome }, 201);
});

export default app;
