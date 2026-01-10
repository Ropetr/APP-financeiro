-- =====================================================
-- SEED INICIAL - Sistema Financeiro Familiar
-- =====================================================
-- Este arquivo cria dados de exemplo para testar o sistema
-- Execute com: wrangler d1 execute financeiro-db --local --file=seed.sql
-- =====================================================

-- Limpar dados anteriores (opcional, apenas para desenvolvimento)
DELETE FROM installments;
DELETE FROM invoices;
DELETE FROM vehicles;
DELETE FROM variable_expenses;
DELETE FROM fixed_expenses;
DELETE FROM incomes;
DELETE FROM credit_cards;
DELETE FROM users;
DELETE FROM families;

-- =====================================================
-- 1. CRIAR FAMÍLIA
-- =====================================================

INSERT INTO families (id, name, created_at, updated_at)
VALUES ('family_1', 'Família Silva', unixepoch(), unixepoch());

-- =====================================================
-- 2. CRIAR USUÁRIOS
-- =====================================================

INSERT INTO users (id, email, name, role, family_id, created_at, updated_at)
VALUES
  ('user_1', 'rodrigo@email.com', 'Rodrigo Silva', 'admin', 'family_1', unixepoch(), unixepoch()),
  ('user_2', 'deyse@email.com', 'Deyse Silva', 'member', 'family_1', unixepoch(), unixepoch());

-- =====================================================
-- 3. CRIAR CARTÕES DE CRÉDITO
-- =====================================================

INSERT INTO credit_cards (id, family_id, name, holder, brand, closing_day, due_day, "limit", color, active, created_at, updated_at)
VALUES
  ('card_itau_rodrigo', 'family_1', 'Itaú Rodrigo', 'Rodrigo', 'visa', 10, 20, 8000.00, '#FF6600', 1, unixepoch(), unixepoch()),
  ('card_itau_deyse', 'family_1', 'Itaú Deyse', 'Deyse', 'visa', 10, 20, 5000.00, '#FF6600', 1, unixepoch(), unixepoch()),
  ('card_nubank', 'family_1', 'Nubank', 'Rodrigo', 'mastercard', 15, 25, 10000.00, '#8A05BE', 1, unixepoch(), unixepoch()),
  ('card_sisprime', 'family_1', 'Sisprime', 'Deyse', 'elo', 5, 12, 3000.00, '#0066CC', 1, unixepoch(), unixepoch());

-- =====================================================
-- 4. CRIAR RECEITAS
-- =====================================================

INSERT INTO incomes (id, family_id, source, responsible, type, monthly_value, has_13th, base_13th, active, created_at, updated_at)
VALUES
  ('income_salario_rodrigo', 'family_1', 'Salário CLT', 'Rodrigo', 'fixed', 6500.00, 1, 6500.00, 1, unixepoch(), unixepoch()),
  ('income_prolabore_deyse', 'family_1', 'Pró-Labore', 'Deyse', 'fixed', 4000.00, 1, 4000.00, 1, unixepoch(), unixepoch()),
  ('income_freelance', 'family_1', 'Freelance', 'Rodrigo', 'variable', 1500.00, 0, NULL, 1, unixepoch(), unixepoch());

-- Total mensal: R$ 12.000,00
-- Com 13º (nov/dez): +R$ 5.250,00 cada mês

-- =====================================================
-- 5. CRIAR DESPESAS FIXAS
-- =====================================================

INSERT INTO fixed_expenses (id, family_id, name, category, monthly_value, is_annual, annual_month, annual_value, due_day, active, created_at, updated_at)
VALUES
  -- Moradia
  ('exp_aluguel', 'family_1', 'Aluguel', 'moradia', 2000.00, 0, NULL, NULL, 10, 1, unixepoch(), unixepoch()),
  ('exp_condominio', 'family_1', 'Condomínio', 'moradia', 450.00, 0, NULL, NULL, 15, 1, unixepoch(), unixepoch()),
  ('exp_energia', 'family_1', 'Energia Elétrica', 'moradia', 280.00, 0, NULL, NULL, 20, 1, unixepoch(), unixepoch()),
  ('exp_agua', 'family_1', 'Água', 'moradia', 120.00, 0, NULL, NULL, 15, 1, unixepoch(), unixepoch()),
  ('exp_internet', 'family_1', 'Internet', 'moradia', 150.00, 0, NULL, NULL, 5, 1, unixepoch(), unixepoch()),

  -- Educação
  ('exp_escola_filho1', 'family_1', 'Escola Filho 1', 'educacao', 950.00, 0, NULL, NULL, 5, 1, unixepoch(), unixepoch()),
  ('exp_escola_filho2', 'family_1', 'Escola Filho 2', 'educacao', 950.00, 0, NULL, NULL, 5, 1, unixepoch(), unixepoch()),

  -- Saúde
  ('exp_plano_saude', 'family_1', 'Plano de Saúde', 'saude', 1200.00, 0, NULL, NULL, 10, 1, unixepoch(), unixepoch()),

  -- Seguros
  ('exp_seguro_carro1', 'family_1', 'Seguro Carro 1', 'seguros', 350.00, 0, NULL, NULL, 25, 1, unixepoch(), unixepoch()),
  ('exp_seguro_carro2', 'family_1', 'Seguro Carro 2', 'seguros', 280.00, 0, NULL, NULL, 25, 1, unixepoch(), unixepoch()),

  -- Assinaturas
  ('exp_netflix', 'family_1', 'Netflix', 'lazer', 55.00, 0, NULL, NULL, 12, 1, unixepoch(), unixepoch()),
  ('exp_spotify', 'family_1', 'Spotify', 'lazer', 34.00, 0, NULL, NULL, 15, 1, unixepoch(), unixepoch());

-- Total fixo mensal: R$ 6.819,00

-- =====================================================
-- 6. CRIAR DESPESAS VARIÁVEIS
-- =====================================================

INSERT INTO variable_expenses (id, family_id, name, category, average_value, active, created_at, updated_at)
VALUES
  ('var_alimentacao', 'family_1', 'Alimentação (Mercado + Restaurantes)', 'alimentacao', 1800.00, 1, unixepoch(), unixepoch()),
  ('var_combustivel_carro1', 'family_1', 'Combustível Carro 1', 'transporte', 450.00, 1, unixepoch(), unixepoch()),
  ('var_combustivel_carro2', 'family_1', 'Combustível Carro 2', 'transporte', 350.00, 1, unixepoch(), unixepoch()),
  ('var_combustivel_moto', 'family_1', 'Combustível Moto', 'transporte', 150.00, 1, unixepoch(), unixepoch()),
  ('var_farmacia', 'family_1', 'Farmácia', 'saude', 200.00, 1, unixepoch(), unixepoch()),
  ('var_lazer', 'family_1', 'Lazer', 'lazer', 400.00, 1, unixepoch(), unixepoch()),
  ('var_vestuario', 'family_1', 'Vestuário', 'vestuario', 300.00, 1, unixepoch(), unixepoch()),
  ('var_manutencao', 'family_1', 'Manutenção Veículos', 'transporte', 250.00, 1, unixepoch(), unixepoch()),
  ('var_imprevistos', 'family_1', 'Imprevistos', 'outros', 200.00, 1, unixepoch(), unixepoch());

-- Total variável mensal: R$ 4.100,00

-- =====================================================
-- 7. CRIAR VEÍCULOS
-- =====================================================

INSERT INTO vehicles (id, family_id, name, type, brand, model, year, ipva_value, ipva_month, licensing_value, licensing_month, active, created_at, updated_at)
VALUES
  ('vehicle_carro1', 'family_1', 'Carro 1', 'car', 'Toyota', 'Corolla', 2020, 1800.00, '2026-03', 150.00, '2026-03', 1, unixepoch(), unixepoch()),
  ('vehicle_carro2', 'family_1', 'Carro 2', 'car', 'Honda', 'Civic', 2019, 1500.00, '2026-04', 150.00, '2026-04', 1, unixepoch(), unixepoch()),
  ('vehicle_moto', 'family_1', 'Moto', 'motorcycle', 'Honda', 'CB 500', 2021, 350.00, '2026-02', 100.00, '2026-02', 1, unixepoch(), unixepoch());

-- =====================================================
-- 8. CRIAR PARCELAS (Exemplo de compras parceladas)
-- =====================================================

INSERT INTO installments (id, family_id, card_id, merchant, description, category, installment_value, current_installment, total_installments, total_value, start_month, end_month, type, active, paid, created_at, updated_at)
VALUES
  -- Notebook parcelado em 12x
  ('inst_notebook', 'family_1', 'card_nubank', 'Magazine Luiza', 'Notebook Dell', 'eletronicos', 300.00, 1, 12, 3600.00, '2026-01', '2026-12', 'installment', 1, 0, unixepoch(), unixepoch()),

  -- Geladeira parcelada em 10x
  ('inst_geladeira', 'family_1', 'card_itau_rodrigo', 'Casas Bahia', 'Geladeira Brastemp', 'eletrodomesticos', 250.00, 1, 10, 2500.00, '2026-01', '2026-10', 'installment', 1, 0, unixepoch(), unixepoch()),

  -- Sofá parcelado em 8x
  ('inst_sofa', 'family_1', 'card_itau_deyse', 'Tok&Stok', 'Sofá 3 lugares', 'moveis', 400.00, 1, 8, 3200.00, '2026-01', '2026-08', 'installment', 1, 0, unixepoch(), unixepoch()),

  -- Academia (recorrente mensal)
  ('inst_academia', 'family_1', 'card_nubank', 'SmartFit', 'Academia Rodrigo', 'saude', 89.90, 1, 12, 1078.80, '2026-01', '2026-12', 'recurring', 1, 0, unixepoch(), unixepoch()),

  -- Parcelamento de saldo devedor (exemplo)
  ('inst_saldo_natal', 'family_1', 'card_sisprime', 'Saldo Devedor Dezembro', 'Parcelamento fatura Natal', 'outros', 350.00, 1, 6, 2100.00, '2026-01', '2026-06', 'balance', 1, 0, unixepoch(), unixepoch()),

  -- Viagem parcelada
  ('inst_viagem', 'family_1', 'card_nubank', 'CVC', 'Passagens aéreas família', 'lazer', 600.00, 1, 10, 6000.00, '2026-01', '2026-10', 'installment', 1, 0, unixepoch(), unixepoch()),

  -- Celular parcelado
  ('inst_celular', 'family_1', 'card_itau_rodrigo', 'Apple Store', 'iPhone 15', 'eletronicos', 450.00, 1, 12, 5400.00, '2026-01', '2026-12', 'installment', 1, 0, unixepoch(), unixepoch());

-- Total em parcelas neste exemplo (mês de janeiro/2026):
-- 300 + 250 + 400 + 89.90 + 350 + 600 + 450 = R$ 2.439,90

-- =====================================================
-- RESUMO FINANCEIRO (Janeiro/2026)
-- =====================================================
-- Receitas:          R$ 12.000,00
-- Despesas Fixas:    R$  6.819,00
-- Despesas Variáveis: R$  4.100,00
-- Parcelas Cartões:  R$  2.439,90
-- =====================================================
-- Saldo antes cartões: R$ 1.081,00
-- Saldo final:         R$ -1.358,90 (NEGATIVO - Atenção!)
-- =====================================================
-- Percentual comprometido: 111,3% (acima da renda!)
-- =====================================================

-- =====================================================
-- FIM DO SEED
-- =====================================================
