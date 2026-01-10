import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '@financeiro/database';
import { getAuthUser } from '../middleware/auth';
import { requirePlan } from '../middleware/auth';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// GET /api/invoices - Lista faturas
app.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);

  const invoices = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.familyId, user!.familyId))
    .all();

  return c.json({ success: true, data: invoices });
});

// POST /api/invoices - Upload de fatura
app.post('/', async (c) => {
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);

  const formData = await c.req.formData();
  const file = formData.get('file') as File;
  const cardId = formData.get('cardId') as string;
  const referenceMonth = formData.get('referenceMonth') as string;

  if (!file || !cardId || !referenceMonth) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'file, cardId and referenceMonth are required' }
    }, 400);
  }

  // Upload para R2
  const fileId = nanoid();
  const fileName = `${user!.familyId}/${cardId}/${referenceMonth}/${fileId}.pdf`;

  await c.env.INVOICES.put(fileName, file.stream(), {
    httpMetadata: {
      contentType: file.type,
    },
  });

  // Salvar no banco
  const newInvoice = {
    id: fileId,
    familyId: user!.familyId,
    cardId,
    fileName: file.name,
    fileUrl: fileName,
    fileSize: file.size,
    referenceMonth,
    status: 'pending' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(schema.invoices).values(newInvoice).run();

  // TODO: Disparar processamento com IA em background
  // await c.env.AI.run(...)

  return c.json({ success: true, data: newInvoice }, 201);
});

// POST /api/invoices/:id/process - Processar fatura com IA (GATING: PRO/FAMILY)
app.post('/:id/process', requirePlan(['PRO', 'FAMILY']), async (c) => {
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);
  const { id } = c.req.param();

  const invoice = await db
    .select()
    .from(schema.invoices)
    .where(eq(schema.invoices.id, id))
    .get();

  if (!invoice) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Invoice not found' } }, 404);
  }

  // Verificar se a fatura pertence à família do usuário
  if (invoice.familyId !== user!.familyId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Você não tem acesso a esta fatura' }
    }, 403);
  }

  // Atualizar status para processing
  await db
    .update(schema.invoices)
    .set({ status: 'processing', updatedAt: new Date() })
    .where(eq(schema.invoices.id, id))
    .run();

  // TODO: Implementar processamento com Cloudflare AI
  // const fileObject = await c.env.INVOICES.get(invoice.fileUrl);
  // const aiResult = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {...});

  return c.json({
    success: true,
    message: 'Invoice processing started. Feature requires PRO or FAMILY plan.',
    data: { id, status: 'processing' }
  });
});

export default app;
