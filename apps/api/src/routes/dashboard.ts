import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import {
  getMonthlyConsolidation,
  getMonthlyBudget,
  getAnnualPlanning,
  getFamilyStats
} from '@financeiro/database';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// GET /api/dashboard/stats - Estatísticas gerais
app.get('/stats', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const stats = await getFamilyStats(db, familyId);

  return c.json({ success: true, data: stats });
});

// GET /api/dashboard/consolidation - Consolidado mensal
app.get('/consolidation', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const { startMonth, endMonth } = c.req.query();

  if (!startMonth || !endMonth) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'startMonth and endMonth are required' }
    }, 400);
  }

  const consolidation = await getMonthlyConsolidation(db, familyId, startMonth, endMonth);

  return c.json({ success: true, data: consolidation });
});

// GET /api/dashboard/budget/:month - Orçamento de um mês específico
app.get('/budget/:month', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth
  const { month } = c.req.param();

  const budget = await getMonthlyBudget(db, familyId, month);

  return c.json({ success: true, data: budget });
});

// GET /api/dashboard/planning - Planejamento anual
app.get('/planning', async (c) => {
  const db = drizzle(c.env.DB);
  const familyId = 'family_1'; // TODO: Pegar do JWT/Auth

  const { startMonth } = c.req.query();

  // Se não fornecido, usar o mês atual
  const start = startMonth || new Date().toISOString().substring(0, 7);

  const planning = await getAnnualPlanning(db, familyId, start);

  return c.json({ success: true, data: planning });
});

export default app;
