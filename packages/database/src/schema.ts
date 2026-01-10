import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

/**
 * Tabela de Usuários
 * Controle de acesso e família
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull().default('member'),
  familyId: text('family_id').notNull(),

  // Auth fields (added by migration 0002_auth.sql)
  passwordHash: text('password_hash').notNull().default(''),
  passwordSalt: text('password_salt').notNull().default(''),
  passwordAlgo: text('password_algo').notNull().default('PBKDF2-SHA256'),
  passwordIters: integer('password_iters').notNull().default(150000),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  plan: text('plan', { enum: ['FREE', 'PRO', 'FAMILY'] }).notNull().default('FREE'),
  stripeCustomerId: text('stripe_customer_id'),
  avatarUrl: text('avatar_url'),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * Tabela de Famílias
 * Cada família tem seu próprio conjunto de dados isolados
 */
export const families = sqliteTable('families', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * Tabela de Cartões de Crédito
 * Armazena informações dos cartões (SEM dados sensíveis)
 */
export const creditCards = sqliteTable('credit_cards', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // ex: "Itaú Rodrigo", "Nubank Deyse"
  holder: text('holder').notNull(), // nome do titular
  brand: text('brand'), // Visa, Mastercard, etc.
  color: text('color').default('#6366f1'), // cor para UI
  closingDay: integer('closing_day').notNull(), // dia do fechamento
  dueDay: integer('due_day').notNull(), // dia do vencimento
  limit: real('limit'), // limite do cartão (opcional)
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('credit_cards_family_idx').on(table.familyId),
}));

/**
 * TABELA-MÃE: Parcelas por Cartão
 * Esta é a base de dados principal de todo o sistema
 * Cada linha representa uma obrigação financeira futura
 */
export const installments = sqliteTable('installments', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  cardId: text('card_id').notNull().references(() => creditCards.id, { onDelete: 'cascade' }),

  // Identificação da compra
  merchant: text('merchant').notNull(), // estabelecimento
  description: text('description'), // descrição adicional
  category: text('category'), // categoria (alimentação, transporte, etc.)

  // Estrutura de parcelamento
  installmentValue: real('installment_value').notNull(), // valor de cada parcela
  currentInstallment: integer('current_installment').notNull(), // parcela atual (1, 2, 3...)
  totalInstallments: integer('total_installments').notNull(), // total de parcelas
  totalValue: real('total_value').notNull(), // valor total da compra

  // Período
  startMonth: text('start_month').notNull(), // formato YYYY-MM
  endMonth: text('end_month').notNull(), // formato YYYY-MM

  // Tipo de lançamento
  type: text('type', {
    enum: ['installment', 'balance', 'recurring', 'single']
  }).notNull().default('installment'),
  // installment: compra parcelada normal
  // balance: parcelamento de saldo devedor
  // recurring: assinatura/mensalidade
  // single: compra à vista

  // Controle
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  paid: integer('paid', { mode: 'boolean' }).notNull().default(false),

  // Metadados
  originalInvoiceId: text('original_invoice_id'), // ID da fatura original (para rastreio)
  notes: text('notes'), // observações

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('installments_family_idx').on(table.familyId),
  cardIdx: index('installments_card_idx').on(table.cardId),
  monthIdx: index('installments_month_idx').on(table.startMonth, table.endMonth),
  activeIdx: index('installments_active_idx').on(table.active),
}));

/**
 * Tabela de Receitas
 * Fontes de renda da família
 */
export const incomes = sqliteTable('incomes', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),

  source: text('source').notNull(), // fonte da receita (salário, pró-labore, etc)
  responsible: text('responsible').notNull(), // responsável
  type: text('type', { enum: ['fixed', 'variable'] }).notNull(),

  monthlyValue: real('monthly_value').notNull(),

  // 13º salário
  has13th: integer('has_13th', { mode: 'boolean' }).notNull().default(false),
  base13th: real('base_13th'), // base de cálculo do 13º (se diferente do salário)

  active: integer('active', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('incomes_family_idx').on(table.familyId),
}));

/**
 * Tabela de Despesas Fixas
 * Despesas recorrentes mensais
 */
export const fixedExpenses = sqliteTable('fixed_expenses', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  category: text('category').notNull(), // moradia, educação, saúde, etc
  monthlyValue: real('monthly_value').notNull(),

  // Despesas anuais (ex: IPVA)
  isAnnual: integer('is_annual', { mode: 'boolean' }).notNull().default(false),
  annualMonth: text('annual_month'), // mês que a despesa anual ocorre (YYYY-MM)
  annualValue: real('annual_value'), // valor anual

  dueDay: integer('due_day'), // dia do vencimento

  active: integer('active', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('fixed_expenses_family_idx').on(table.familyId),
}));

/**
 * Tabela de Despesas Variáveis
 * Valores médios para projeção
 */
export const variableExpenses = sqliteTable('variable_expenses', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  category: text('category').notNull(), // alimentação, combustível, etc
  averageValue: real('average_value').notNull(), // valor médio mensal

  active: integer('active', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('variable_expenses_family_idx').on(table.familyId),
}));

/**
 * Tabela de Faturas
 * Armazena faturas enviadas para análise de IA
 */
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
  cardId: text('card_id').notNull().references(() => creditCards.id, { onDelete: 'cascade' }),

  // Arquivo
  fileUrl: text('file_url').notNull(), // URL no R2
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),

  // Período
  referenceMonth: text('reference_month').notNull(), // YYYY-MM

  // Processamento
  status: text('status', {
    enum: ['pending', 'processing', 'completed', 'failed']
  }).notNull().default('pending'),

  // Dados extraídos
  totalValue: real('total_value'),
  dueDate: text('due_date'),
  closingDate: text('closing_date'),

  // IA
  aiProcessedAt: integer('ai_processed_at', { mode: 'timestamp' }),
  aiError: text('ai_error'),
  aiData: text('ai_data', { mode: 'json' }), // dados brutos da IA

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('invoices_family_idx').on(table.familyId),
  cardIdx: index('invoices_card_idx').on(table.cardId),
  monthIdx: index('invoices_month_idx').on(table.referenceMonth),
  statusIdx: index('invoices_status_idx').on(table.status),
}));

/**
 * Tabela de Veículos
 * Para controle de IPVA, licenciamento e manutenção
 */
export const vehicles = sqliteTable('vehicles', {
  id: text('id').primaryKey(),
  familyId: text('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),

  name: text('name').notNull(), // ex: "Carro 1", "Moto"
  type: text('type', { enum: ['car', 'motorcycle', 'other'] }).notNull(),
  brand: text('brand'),
  model: text('model'),
  year: integer('year'),

  // IPVA e licenciamento
  ipvaValue: real('ipva_value'),
  ipvaMonth: text('ipva_month'), // mês de vencimento
  licensingValue: real('licensing_value'),
  licensingMonth: text('licensing_month'),

  active: integer('active', { mode: 'boolean' }).notNull().default(true),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  familyIdx: index('vehicles_family_idx').on(table.familyId),
}));

// Tipos TypeScript derivados do schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;

export type CreditCard = typeof creditCards.$inferSelect;
export type NewCreditCard = typeof creditCards.$inferInsert;

export type Installment = typeof installments.$inferSelect;
export type NewInstallment = typeof installments.$inferInsert;

export type Income = typeof incomes.$inferSelect;
export type NewIncome = typeof incomes.$inferInsert;

export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type NewFixedExpense = typeof fixedExpenses.$inferInsert;

export type VariableExpense = typeof variableExpenses.$inferSelect;
export type NewVariableExpense = typeof variableExpenses.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
