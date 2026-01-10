# Como Começar - Guia Rápido

Este guia te leva do zero ao sistema rodando em menos de 10 minutos.

## Pré-requisitos

1. **Node.js 20+**
   - Download: https://nodejs.org/

2. **pnpm** (gerenciador de pacotes)
   ```bash
   npm install -g pnpm
   ```

3. **Conta Cloudflare** (gratuita)
   - Cadastro: https://dash.cloudflare.com/sign-up

## Passo 1: Instalar Dependências

```bash
cd "C:\Users\WINDOWS GAMER\Desktop\APP FInanceiro"
pnpm install
```

Isso vai instalar todas as dependências do monorepo.

## Passo 2: Configurar Cloudflare

### 2.1 Instalar Wrangler CLI

```bash
pnpm add -g wrangler
```

### 2.2 Login no Cloudflare

```bash
wrangler login
```

Isso vai abrir o navegador para você autorizar.

### 2.3 Criar Banco de Dados D1

```bash
cd apps/api
wrangler d1 create financeiro-db
```

Copie o `database_id` que aparece e cole no `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "financeiro-db"
database_id = "COLE_O_ID_AQUI"  # <-- Substituir
```

### 2.4 Criar Bucket R2 (para faturas)

```bash
wrangler r2 bucket create financeiro-invoices
```

### 2.5 Criar as tabelas do banco

```bash
cd ../../packages/database
pnpm generate
```

Isso vai gerar as migrations SQL.

Depois aplicar no banco local:

```bash
cd ../../apps/api
wrangler d1 execute financeiro-db --local --file=../../packages/database/migrations/0001_initial.sql
```

## Passo 3: Rodar a API em Desenvolvimento

```bash
# Ainda em apps/api
pnpm dev
```

A API vai subir em: http://localhost:8787

Teste acessando: http://localhost:8787

Você deve ver:
```json
{
  "name": "Financeiro API",
  "version": "1.0.0",
  "status": "healthy",
  "environment": "development"
}
```

## Passo 4: Testar Endpoints

### Criar um cartão

```bash
curl -X POST http://localhost:8787/api/cards \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Nubank",
    "holder": "João",
    "closingDay": 10,
    "dueDay": 20,
    "color": "#8A05BE"
  }'
```

### Criar uma parcela

```bash
curl -X POST http://localhost:8787/api/installments \
  -H "Content-Type: application/json" \
  -d '{
    "cardId": "ID_DO_CARTAO_CRIADO",
    "merchant": "Magazine Luiza",
    "description": "Notebook",
    "installmentValue": 150.00,
    "currentInstallment": 1,
    "totalInstallments": 12,
    "totalValue": 1800.00,
    "startMonth": "2026-01",
    "category": "eletronicos"
  }'
```

### Ver consolidado mensal

```bash
curl "http://localhost:8787/api/dashboard/consolidation?startMonth=2026-01&endMonth=2026-12"
```

## Passo 5: Estrutura de Dados Inicial

Para começar a usar, você precisa criar:

1. **Família** (se ainda não tiver)
2. **Usuários**
3. **Cartões de Crédito**
4. **Receitas**
5. **Despesas Fixas**
6. **Despesas Variáveis**
7. **Parcelas** (a tabela-mãe)

Exemplo de seed inicial:

```sql
-- Criar família
INSERT INTO families (id, name, created_at, updated_at)
VALUES ('family_1', 'Família Silva', unixepoch(), unixepoch());

-- Criar usuário admin
INSERT INTO users (id, email, name, role, family_id, created_at, updated_at)
VALUES ('user_1', 'joao@email.com', 'João Silva', 'admin', 'family_1', unixepoch(), unixepoch());

-- Criar cartões
INSERT INTO credit_cards (id, family_id, name, holder, closing_day, due_day, color, active, created_at, updated_at)
VALUES
  ('card_1', 'family_1', 'Nubank', 'João', 10, 20, '#8A05BE', 1, unixepoch(), unixepoch()),
  ('card_2', 'family_1', 'Itaú', 'Maria', 5, 15, '#FF6600', 1, unixepoch(), unixepoch());

-- Criar receitas
INSERT INTO incomes (id, family_id, source, responsible, type, monthly_value, has_13th, active, created_at, updated_at)
VALUES
  ('income_1', 'family_1', 'Salário', 'João', 'fixed', 5000.00, 1, 1, unixepoch(), unixepoch()),
  ('income_2', 'family_1', 'Freelance', 'Maria', 'variable', 2000.00, 0, 1, unixepoch(), unixepoch());

-- Criar despesas fixas
INSERT INTO fixed_expenses (id, family_id, name, category, monthly_value, is_annual, active, created_at, updated_at)
VALUES
  ('expense_1', 'family_1', 'Aluguel', 'moradia', 1500.00, 0, 1, unixepoch(), unixepoch()),
  ('expense_2', 'family_1', 'Escola', 'educacao', 800.00, 0, 1, unixepoch(), unixepoch()),
  ('expense_3', 'family_1', 'Plano de Saúde', 'saude', 600.00, 0, 1, unixepoch(), unixepoch());

-- Criar despesas variáveis
INSERT INTO variable_expenses (id, family_id, name, category, average_value, active, created_at, updated_at)
VALUES
  ('var_1', 'family_1', 'Alimentação', 'alimentacao', 1200.00, 1, unixepoch(), unixepoch()),
  ('var_2', 'family_1', 'Combustível', 'transporte', 400.00, 1, unixepoch(), unixepoch());
```

Execute:

```bash
wrangler d1 execute financeiro-db --local --command="[SQL ACIMA]"
```

## Passo 6: Próximos Passos

Com a API rodando e dados iniciais, você pode:

### Opção A: Criar o Frontend Web (Next.js)

1. Configurar Next.js em `apps/web`
2. Criar dashboard
3. Integrar com a API

### Opção B: Testar a API via Postman/Insomnia

1. Importar coleção de endpoints
2. Testar todos os fluxos
3. Validar cálculos financeiros

### Opção C: Deploy da API

1. Deploy em produção na Cloudflare
2. Criar banco D1 de produção
3. Executar migrations de produção

## Comandos Úteis

```bash
# Rodar toda a stack de desenvolvimento
pnpm dev

# Rodar apenas a API
pnpm --filter api dev

# Ver logs da API em produção
pnpm --filter api tail

# Deploy da API
pnpm --filter api deploy

# Executar query no banco local
wrangler d1 execute financeiro-db --local --command="SELECT * FROM families"

# Executar query no banco de produção
wrangler d1 execute financeiro-db --command="SELECT * FROM families"

# Gerar novas migrations
cd packages/database && pnpm generate

# Ver banco no navegador (Drizzle Studio)
cd packages/database && pnpm studio
```

## Troubleshooting

### Erro: "Unknown binding DB"

Você esqueceu de criar o banco D1 ou não atualizou o `database_id` no `wrangler.toml`.

### Erro: "Table not found"

Você não executou as migrations. Rode:
```bash
wrangler d1 execute financeiro-db --local --file=caminho/para/migration.sql
```

### Erro: "pnpm not found"

Instale o pnpm:
```bash
npm install -g pnpm
```

### API não sobe

Verifique se está na pasta correta:
```bash
cd apps/api
pnpm dev
```

## Resumo dos Endpoints

### Cartões
- `GET /api/cards` - Lista
- `POST /api/cards` - Cria
- `PUT /api/cards/:id` - Atualiza
- `DELETE /api/cards/:id` - Deleta

### Parcelas
- `GET /api/installments` - Lista (aceita filtros)
- `POST /api/installments` - Cria
- `PUT /api/installments/:id` - Atualiza
- `DELETE /api/installments/:id` - Deleta

### Receitas
- `GET /api/incomes` - Lista
- `POST /api/incomes` - Cria

### Despesas
- `GET /api/expenses/fixed` - Lista fixas
- `POST /api/expenses/fixed` - Cria fixa
- `GET /api/expenses/variable` - Lista variáveis
- `POST /api/expenses/variable` - Cria variável

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas
- `GET /api/dashboard/consolidation?startMonth=YYYY-MM&endMonth=YYYY-MM` - Consolidado
- `GET /api/dashboard/budget/:month` - Orçamento do mês
- `GET /api/dashboard/planning?startMonth=YYYY-MM` - Planejamento anual

### Faturas
- `GET /api/invoices` - Lista
- `POST /api/invoices` - Upload
- `POST /api/invoices/:id/process` - Processa com IA

---

**Agora você tem um sistema financeiro completo rodando localmente!**

Próximo passo sugerido: Criar o frontend web com Next.js para visualizar os dados.
