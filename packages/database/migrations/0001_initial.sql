-- =====================================================
-- Migration 0001: Schema Inicial - Sistema Financeiro
-- =====================================================

-- =========================
-- Famílias (Multi-tenant)
-- =========================
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- =========================
-- Usuários
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_family_id ON users(family_id);

-- =========================
-- Cartões de Crédito
-- =========================
CREATE TABLE IF NOT EXISTS credit_cards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  holder TEXT NOT NULL,
  brand TEXT,
  color TEXT DEFAULT '#6366f1',
  closing_day INTEGER NOT NULL,
  due_day INTEGER NOT NULL,
  "limit" REAL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_family_id ON credit_cards(family_id);

-- =========================
-- TABELA-MÃE: Parcelas
-- =========================
CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,

  merchant TEXT NOT NULL,
  description TEXT,
  category TEXT,

  installment_value REAL NOT NULL,
  current_installment INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  total_value REAL NOT NULL,

  start_month TEXT NOT NULL,
  end_month TEXT NOT NULL,

  type TEXT NOT NULL DEFAULT 'installment',

  active INTEGER NOT NULL DEFAULT 1,
  paid INTEGER NOT NULL DEFAULT 0,

  original_invoice_id TEXT,
  notes TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_installments_family_id ON installments(family_id);
CREATE INDEX IF NOT EXISTS idx_installments_card_id ON installments(card_id);
CREATE INDEX IF NOT EXISTS idx_installments_month ON installments(start_month, end_month);
CREATE INDEX IF NOT EXISTS idx_installments_active ON installments(active);

-- =========================
-- Receitas
-- =========================
CREATE TABLE IF NOT EXISTS incomes (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  source TEXT NOT NULL,
  responsible TEXT NOT NULL,
  type TEXT NOT NULL,

  monthly_value REAL NOT NULL,

  has_13th INTEGER NOT NULL DEFAULT 0,
  base_13th REAL,

  active INTEGER NOT NULL DEFAULT 1,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incomes_family_id ON incomes(family_id);

-- =========================
-- Despesas Fixas
-- =========================
CREATE TABLE IF NOT EXISTS fixed_expenses (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  category TEXT NOT NULL,
  monthly_value REAL NOT NULL,

  is_annual INTEGER NOT NULL DEFAULT 0,
  annual_month TEXT,
  annual_value REAL,

  due_day INTEGER,

  active INTEGER NOT NULL DEFAULT 1,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fixed_expenses_family_id ON fixed_expenses(family_id);

-- =========================
-- Despesas Variáveis
-- =========================
CREATE TABLE IF NOT EXISTS variable_expenses (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  category TEXT NOT NULL,
  average_value REAL NOT NULL,

  active INTEGER NOT NULL DEFAULT 1,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_variable_expenses_family_id ON variable_expenses(family_id);

-- =========================
-- Faturas (para IA)
-- =========================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,

  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,

  reference_month TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'pending',

  total_value REAL,
  due_date TEXT,
  closing_date TEXT,

  ai_processed_at INTEGER,
  ai_error TEXT,
  ai_data TEXT,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_family_id ON invoices(family_id);
CREATE INDEX IF NOT EXISTS idx_invoices_card_id ON invoices(card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON invoices(reference_month);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- =========================
-- Veículos
-- =========================
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year INTEGER,

  ipva_value REAL,
  ipva_month TEXT,
  licensing_value REAL,
  licensing_month TEXT,

  active INTEGER NOT NULL DEFAULT 1,

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_family_id ON vehicles(family_id);

-- =====================================================
-- FIM DA MIGRATION INICIAL
-- =====================================================
