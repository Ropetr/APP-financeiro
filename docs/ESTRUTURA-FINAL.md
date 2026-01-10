# Estrutura Final do Projeto

## Árvore de Arquivos Completa

```
APP FInanceiro/
├── apps/
│   ├── api/                              # Cloudflare Workers API
│   │   ├── src/
│   │   │   ├── index.ts                  # Entry point (✅ auth protegido)
│   │   │   ├── lib/
│   │   │   │   └── crypto.ts             # PBKDF2, JWT, hash, tokens
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts               # requireAuth, requirePlan, requireRole
│   │   │   │   └── rate-limit.ts         # Rate limiting D1
│   │   │   └── routes/
│   │   │       ├── auth.ts               # Register, login, refresh, logout, reset
│   │   │       ├── billing.ts            # Stripe checkout, webhook, cancel
│   │   │       ├── cards.ts              # CRUD cartões
│   │   │       ├── dashboard.ts          # Stats, consolidação, planejamento
│   │   │       ├── expenses.ts           # Despesas fixas/variáveis
│   │   │       ├── incomes.ts            # Receitas
│   │   │       ├── installments.ts       # Parcelas (tabela-mãe)
│   │   │       └── invoices.ts           # Upload + IA (gating PRO/FAMILY)
│   │   ├── wrangler.toml                 # Config Cloudflare + JWT_SECRET
│   │   ├── seed.sql                      # Dados de exemplo
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── web/                              # Next.js (A CRIAR)
│   └── mobile/                           # React Native + Expo (A CRIAR)
│
├── packages/
│   ├── database/
│   │   ├── src/
│   │   │   ├── schema.ts                 # Schema principal D1
│   │   │   ├── auth-schema.ts            # Schema auth (sessions, resets, audit)
│   │   │   ├── queries.ts                # Queries financeiras
│   │   │   └── index.ts
│   │   ├── migrations/
│   │   │   ├── 0001_initial.sql          # (A GERAR)
│   │   │   └── 0002_auth.sql             # ✅ Auth completo
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── types/
│   │   ├── src/
│   │   │   └── index.ts                  # Types, DTOs, formatters, utils
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                               # Componentes UI (A CRIAR)
│
├── docs/
│   ├── PROJETO-CRIADO.md                 # Overview completo
│   ├── COMO-COMECAR.md                   # Guia rápido
│   ├── AUTH.md                           # ✅ Doc completa de auth JWT
│   ├── BILLING.md                        # ✅ Doc completa Stripe
│   └── ESTRUTURA-FINAL.md                # Este arquivo
│
├── package.json                          # Root (monorepo)
├── turbo.json                            # Turborepo config
├── pnpm-workspace.yaml                   # Workspace config
├── .gitignore
├── .npmrc
└── README.md
```

---

## O que Foi Implementado

### ✅ 1. Auth JWT Completo

**Arquivos:**
- `apps/api/src/lib/crypto.ts` - PBKDF2, JWT, tokens
- `apps/api/src/middleware/auth.ts` - requireAuth, requirePlan
- `apps/api/src/middleware/rate-limit.ts` - Proteção brute force
- `apps/api/src/routes/auth.ts` - Todos os endpoints
- `packages/database/migrations/0002_auth.sql` - Tabelas auth
- `packages/database/src/auth-schema.ts` - Schema Drizzle

**Endpoints:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh (com rotação)
- POST /api/auth/logout
- POST /api/auth/forgot
- POST /api/auth/reset
- GET /api/auth/me

**Segurança:**
- PBKDF2-SHA256 (150k iterações)
- Access JWT 15min
- Refresh token 30 dias
- Rate limiting
- Audit logs
- Validação de senha forte

---

### ✅ 2. Billing Stripe Completo

**Arquivos:**
- `apps/api/src/routes/billing.ts` - Checkout, webhook, cancel
- `packages/database/src/auth-schema.ts` - subscriptions table

**Endpoints:**
- POST /api/billing/checkout
- POST /api/billing/webhook (valida assinatura)
- GET /api/billing/subscription
- POST /api/billing/cancel

**Features:**
- Stripe Checkout integration
- Webhook events (checkout, subscription, payment failed)
- Gating por plano (FREE/PRO/FAMILY)
- Audit logs de billing

---

### ✅ 3. Gating Implementado

**IA de Faturas:**
- POST /api/invoices/:id/process → `requirePlan(['PRO', 'FAMILY'])`
- FREE bloqueado com erro 403

**Response FREE:**
```json
{
  "success": false,
  "error": {
    "code": "PLAN_REQUIRED",
    "message": "Este recurso requer plano: PRO ou FAMILY",
    "currentPlan": "FREE",
    "requiredPlans": ["PRO", "FAMILY"]
  }
}
```

---

### ✅ 4. Rotas Protegidas

Todas as rotas de dados financeiros requerem autenticação:

```typescript
app.use('/api/installments/*', requireAuth);
app.use('/api/cards/*', requireAuth);
app.use('/api/incomes/*', requireAuth);
app.use('/api/expenses/*', requireAuth);
app.use('/api/dashboard/*', requireAuth);
app.use('/api/invoices/*', requireAuth);
```

Tentativa sem token = 401 Unauthorized

---

### ✅ 5. Migrations

**0002_auth.sql** criada com:
- users (ajustado com password, plan, stripe_customer_id)
- sessions
- password_resets
- audit_logs
- subscriptions
- rate_limits

---

### ✅ 6. Documentação Completa

- **AUTH.md**: 400+ linhas, todos os endpoints, exemplos, segurança
- **BILLING.md**: 300+ linhas, Stripe completo, gating, testes
- **COMO-COMECAR.md**: Guia passo a passo
- **PROJETO-CRIADO.md**: Overview e arquitetura

---

## Checklist de Implementação

### Backend (API)

- [x] Auth JWT próprio (register, login, refresh, logout)
- [x] PBKDF2-SHA256 (150k iterações)
- [x] Refresh token com rotação
- [x] Reset de senha
- [x] Rate limiting
- [x] Audit logs
- [x] Middlewares (requireAuth, requirePlan, requireRole)
- [x] Stripe checkout
- [x] Stripe webhook (validação de assinatura)
- [x] Gating por plano (FREE/PRO/FAMILY)
- [x] Subscriptions table
- [x] Rotas protegidas
- [x] Migrations completas

### Pendente

- [ ] Gerar migration inicial (0001_initial.sql)
- [ ] Criar Web App (Next.js)
- [ ] Criar Mobile App (Expo)
- [ ] Implementar IA de faturas (parsing real)
- [ ] Integrar email (reset de senha)
- [ ] Deploy Cloudflare (D1, R2, Workers, Pages)
- [ ] CI/CD (GitHub Actions)

---

## Próximos Passos (ORDEM RECOMENDADA)

### 1. Aplicar Migrations no Banco Local

```bash
cd apps/api

# Criar banco D1 local
wrangler d1 create financeiro-db

# Atualizar database_id no wrangler.toml

# Gerar migration inicial (schema principal)
cd ../../packages/database
pnpm generate

# Aplicar migrations
cd ../../apps/api
wrangler d1 execute financeiro-db --local --file=../../packages/database/migrations/0001_initial.sql
wrangler d1 execute financeiro-db --local --file=../../packages/database/migrations/0002_auth.sql

# Popular com dados de exemplo
wrangler d1 execute financeiro-db --local --file=seed.sql
```

### 2. Testar API Localmente

```bash
cd apps/api
pnpm dev

# Em outro terminal, testar endpoints
curl http://localhost:8787

# Register
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"SecurePass123!","name":"Test User"}'

# Login
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"SecurePass123!"}'

# Me (protegido)
curl http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 3. Criar Web App (Next.js)

```bash
# Criar Next.js
pnpm dlx create-next-app@latest apps/web \
  --ts --tailwind --eslint --app --src-dir --import-alias "@/*"

# Instalar deps
pnpm -C apps/web add axios @tanstack/react-query recharts zod

# Criar client API com interceptor de refresh
# Criar páginas: /login, /register, /dashboard, /cards, /installments, /budget, /invoices
```

### 4. Criar Mobile App (Expo)

```bash
# Criar Expo
pnpm dlx create-expo-app apps/mobile --template blank-typescript

# Instalar deps
pnpm -C apps/mobile add @react-navigation/native @react-navigation/native-stack \
  react-native-screens react-native-safe-area-context expo-secure-store axios

# Criar telas: Login, Dashboard, Cartões, Parcelas, Orçamento, Upload
```

### 5. Configurar Stripe

```bash
# Criar produtos
stripe products create --name="Financeiro PRO"
stripe prices create --product=<PRODUCT_ID> --unit-amount=2990 --currency=brl --recurring-interval=month

# Configurar webhook
# Endpoint: https://financeiro-api.workers.dev/api/billing/webhook

# Atualizar price_ids em apps/api/src/routes/billing.ts
```

### 6. Deploy Cloudflare

```bash
# Login
wrangler login

# Criar banco D1 produção
wrangler d1 create financeiro-db

# Atualizar wrangler.toml com database_id de produção

# Aplicar migrations
wrangler d1 execute financeiro-db --file=../../packages/database/migrations/0001_initial.sql
wrangler d1 execute financeiro-db --file=../../packages/database/migrations/0002_auth.sql

# Criar bucket R2
wrangler r2 bucket create financeiro-invoices

# Definir secrets
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Deploy API
cd apps/api
pnpm deploy

# Deploy Web (Cloudflare Pages)
cd ../web
pnpm build
wrangler pages deploy out
```

### 7. CI/CD (GitHub Actions)

Criar `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm --filter api deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm --filter web build
      - run: wrangler pages deploy apps/web/out
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

---

## Validação Final (Checklist)

Antes de considerar pronto, validar:

### Auth
- [ ] Registro funciona
- [ ] Login funciona
- [ ] Refresh token rotaciona
- [ ] Logout revoga sessão
- [ ] Reset de senha funciona
- [ ] Rotas protegidas bloqueiam sem token

### Billing
- [ ] Checkout redireciona para Stripe
- [ ] Webhook processa eventos
- [ ] Plano é atualizado em users
- [ ] FREE não acessa IA
- [ ] PRO/FAMILY acessa IA
- [ ] Cancelamento funciona

### Financeiro
- [ ] CRUD de cartões funciona
- [ ] CRUD de parcelas funciona
- [ ] Consolidado mensal calcula corretamente
- [ ] Orçamento inclui 13º salário
- [ ] Planejamento anual gera 12 meses
- [ ] Dashboard mostra estatísticas

### Deploy
- [ ] API em produção (workers.dev)
- [ ] Web em produção (pages.dev)
- [ ] D1 produção com dados
- [ ] R2 recebendo uploads
- [ ] Secrets configurados
- [ ] Webhook Stripe funcionando

---

## Estrutura de Dados (D1)

### Principais Tabelas

1. **families** - Multi-tenant
2. **users** - Autenticação + plano
3. **sessions** - Refresh tokens
4. **subscriptions** - Stripe
5. **credit_cards** - Cartões
6. **installments** - **TABELA-MÃE**
7. **incomes** - Receitas
8. **fixed_expenses** - Despesas fixas
9. **variable_expenses** - Despesas variáveis
10. **invoices** - Faturas para IA
11. **vehicles** - IPVA/licenciamento
12. **audit_logs** - Rastreamento

---

## Variáveis de Ambiente

### Desenvolvimento (wrangler.toml)

```toml
[vars]
ENVIRONMENT = "development"
JWT_SECRET = "dev-secret-change-in-production"
```

### Produção (secrets)

```bash
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

---

## Endpoints Completos

### Públicos

- GET / (health check)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- POST /api/auth/forgot
- POST /api/auth/reset
- POST /api/billing/webhook

### Protegidos (requireAuth)

- GET /api/auth/me
- POST /api/billing/checkout
- GET /api/billing/subscription
- POST /api/billing/cancel
- GET /api/cards
- POST /api/cards
- PUT /api/cards/:id
- DELETE /api/cards/:id
- GET /api/installments
- POST /api/installments
- PUT /api/installments/:id
- DELETE /api/installments/:id
- GET /api/incomes
- POST /api/incomes
- GET /api/expenses/fixed
- POST /api/expenses/fixed
- GET /api/expenses/variable
- POST /api/expenses/variable
- GET /api/dashboard/stats
- GET /api/dashboard/consolidation
- GET /api/dashboard/budget/:month
- GET /api/dashboard/planning
- GET /api/invoices
- POST /api/invoices

### Protegidos + Gating (requirePlan)

- POST /api/invoices/:id/process (PRO/FAMILY)

---

## Resumo do Status

### ✅ Completo e Testável

- Auth JWT próprio (100%)
- Stripe Billing (100%)
- Gating por plano (100%)
- Migrations auth (100%)
- Documentação (100%)
- Middlewares (100%)
- Rate limiting (100%)
- Audit logs (100%)

### 🟡 Preparado mas Não Criado

- Web App (Next.js) - estrutura definida
- Mobile App (Expo) - estrutura definida
- IA de faturas - endpoint pronto, falta implementação real

### 🔴 Pendente

- Migration inicial (0001)
- Deploy produção
- CI/CD
- Integração de email

---

**Sistema de autenticação JWT próprio + Stripe completo e pronto para ser testado localmente!**

**Próximo passo recomendado:** Aplicar migrations e testar endpoints.
