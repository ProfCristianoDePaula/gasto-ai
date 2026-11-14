-- Migration 0001: Estrutura inicial do Gastô no Cloudflare D1 (SQLite)
-- Todas as tabelas isolam dados por user_id (sub do JWT do Supabase).
-- Todos os valores monetários são armazenados em CENTAVOS (INTEGER).

-- 1. Categorias de despesas do usuário
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_categories_user
  ON categories (user_id);

-- 2. Lançamentos de despesas
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  expense_date TEXT NOT NULL, -- Formato YYYY-MM-DD (America/Sao_Paulo)
  merchant TEXT,
  category_id TEXT REFERENCES categories (id) ON DELETE SET NULL,
  notes TEXT,
  source TEXT NOT NULL CHECK (source IN ('image', 'text', 'voice', 'manual')),
  image_key TEXT,
  thumbnail TEXT,
  ai_confidence REAL,
  ai_raw TEXT,
  content_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON expenses (user_id, expense_date);

CREATE INDEX IF NOT EXISTS idx_expenses_user_category
  ON expenses (user_id, category_id);

CREATE INDEX IF NOT EXISTS idx_expenses_user_hash
  ON expenses (user_id, content_hash);

-- 3. Orçamentos mensais por categoria ou total geral (category_id IS NULL)
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT NULL REFERENCES categories (id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, category_id)
);

-- Garante no máximo um orçamento total (category_id IS NULL) por usuário no SQLite
CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_user_total
  ON budgets (user_id)
  WHERE category_id IS NULL;

-- 4. Regras aprendidas por estabelecimento para classificação rápida sem gastar IA
CREATE TABLE IF NOT EXISTS merchant_rules (
  user_id TEXT NOT NULL,
  merchant_norm TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  hits INTEGER NOT NULL DEFAULT 1 CHECK (hits >= 1),
  PRIMARY KEY (user_id, merchant_norm)
);

-- 5. Controle de cota diária de uso de Workers AI por usuário e tipo
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL, -- Formato YYYY-MM-DD
  kind TEXT NOT NULL, -- 'image' | 'text' | 'voice'
  calls INTEGER NOT NULL DEFAULT 0 CHECK (calls >= 0),
  PRIMARY KEY (user_id, day, kind)
);
