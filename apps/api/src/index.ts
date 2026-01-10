import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { drizzle } from 'drizzle-orm/d1';

// Routes
import authRouter from './routes/auth';
import billingRouter from './routes/billing';
import installmentsRouter from './routes/installments';
import cardsRouter from './routes/cards';
import incomesRouter from './routes/incomes';
import expensesRouter from './routes/expenses';
import dashboardRouter from './routes/dashboard';
import invoicesRouter from './routes/invoices';

// Middlewares
import { requireAuth } from './middleware/auth';

export type Env = {
  DB: D1Database;
  INVOICES: R2Bucket;
  AI: any;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
};

const app = new Hono<{ Bindings: Env }>();

// Middlewares
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://financeiro.pages.dev'],
  credentials: true,
}));

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Financeiro API',
    version: '1.0.0',
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
  });
});

// API Routes
// Auth (public)
app.route('/api/auth', authRouter);

// Billing (webhook é público, resto protegido)
app.route('/api/billing', billingRouter);

// Protected routes (requerem autenticação)
app.use('/api/installments/*', requireAuth);
app.use('/api/cards/*', requireAuth);
app.use('/api/incomes/*', requireAuth);
app.use('/api/expenses/*', requireAuth);
app.use('/api/dashboard/*', requireAuth);
app.use('/api/invoices/*', requireAuth);

app.route('/api/installments', installmentsRouter);
app.route('/api/cards', cardsRouter);
app.route('/api/incomes', incomesRouter);
app.route('/api/expenses', expensesRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/invoices', invoicesRouter);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: 'Not Found', message: 'Route not found' }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
