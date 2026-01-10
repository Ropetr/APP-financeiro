# Billing Stripe - Documentação Completa

Sistema de pagamentos e assinaturas vendável com Stripe, webhooks e gating por plano.

## Visão Geral

- **Planos**: FREE, PRO, FAMILY
- **Gateway**: Stripe Checkout
- **Webhooks**: Processamento automático de eventos
- **Gating**: Controle de features por plano
- **Cancelamento**: Self-service no final do período

## Planos e Features

### FREE (Gratuito)
- Cadastro de cartões: ilimitado
- Parcelas manuais: ilimitado
- Orçamento familiar: completo
- Dashboard básico: sim
- **Processamento IA de faturas**: NÃO

### PRO (R$ 29,90/mês)
- Tudo do FREE
- **Processamento IA de faturas**: SIM
- Dashboard avançado: sim
- Exportação de relatórios: sim
- Alertas personalizados: sim

### FAMILY (R$ 49,90/mês)
- Tudo do PRO
- Múltiplos membros: até 5
- Permissões granulares: sim
- Visualizações personalizadas: sim
- Suporte prioritário: sim

---

## Endpoints

### POST /api/billing/checkout

Cria sessão de checkout do Stripe (requer auth).

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Request:**
```json
{
  "plan": "PRO"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_abc123",
    "url": "https://checkout.stripe.com/pay/cs_test_abc123"
  }
}
```

**Uso:**
```typescript
// Client side
const response = await api.post('/api/billing/checkout', { plan: 'PRO' });
window.location.href = response.data.data.url;
```

**Erros:**
- **400**: Plano inválido
- **401**: Não autenticado
- **500**: Stripe não configurado

---

### POST /api/billing/webhook

Webhook do Stripe (público, valida assinatura).

**Headers:**
```
Stripe-Signature: t=1234567890,v1=abc123...
```

**Eventos Processados:**
- `checkout.session.completed`: Ativa plano após pagamento
- `customer.subscription.created`: Cria registro de subscription
- `customer.subscription.updated`: Atualiza status da subscription
- `customer.subscription.deleted`: Downgrade para FREE
- `invoice.payment_failed`: Marca como past_due

**Response (200):**
```json
{
  "received": true
}
```

---

### GET /api/billing/subscription

Retorna assinatura atual do usuário (requer auth).

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "sub_123",
    "userId": "user_abc",
    "stripeSubscriptionId": "sub_1abc",
    "plan": "PRO",
    "status": "active",
    "currentPeriodStart": "2026-01-10T00:00:00.000Z",
    "currentPeriodEnd": "2026-02-10T00:00:00.000Z",
    "cancelAtPeriodEnd": false
  }
}
```

**Status possíveis:**
- `active`: Ativa e paga
- `trialing`: Em período de trial
- `past_due`: Pagamento falhou
- `canceled`: Cancelada

---

### POST /api/billing/cancel

Cancela assinatura no final do período (requer auth).

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response (200):**
```json
{
  "success": true,
  "message": "Assinatura será cancelada ao final do período"
}
```

**Comportamento:**
- Não cancela imediatamente
- Cancela no final do período pago
- Usuário mantém acesso até o fim

**Erros:**
- **404**: Nenhuma assinatura ativa encontrada

---

## Fluxo Completo

### 1. Usuário Clica em "Upgrade para PRO"

```typescript
// Web ou Mobile
const response = await api.post('/api/billing/checkout', {
  plan: 'PRO'
});

// Redirecionar para Stripe Checkout
window.location.href = response.data.data.url;
```

### 2. Stripe Checkout

- Usuário insere dados de pagamento
- Stripe processa pagamento
- Redireciona para `success_url` ou `cancel_url`

### 3. Webhook: `checkout.session.completed`

Backend recebe evento e:
- Atualiza `users.plan` para 'PRO'
- Cria registro em `subscriptions`
- Audit log de `billing.checkout_completed`

### 4. Usuário Retorna ao App

```typescript
// Página de sucesso
if (searchParams.get('checkout') === 'success') {
  // Mostrar mensagem de sucesso
  // Recarregar user
  const { data } = await api.get('/api/auth/me');
  console.log(data.plan); // PRO
}
```

### 5. Gating Automático

```typescript
// Processar fatura agora funciona
await api.post(`/api/invoices/${invoiceId}/process`);
// 200 OK (antes era 403 Forbidden)
```

---

## Configuração Stripe

### 1. Criar Conta Stripe

1. Acesse https://stripe.com
2. Crie conta
3. Ative modo de produção

### 2. Criar Produtos e Preços

**PRO:**
```bash
stripe products create --name="Financeiro PRO" --description="Plano profissional com IA"
# product_id: prod_abc123

stripe prices create --product=prod_abc123 --unit-amount=2990 --currency=brl --recurring-interval=month
# price_id: price_pro_monthly
```

**FAMILY:**
```bash
stripe products create --name="Financeiro FAMILY" --description="Plano familiar com múltiplos membros"
# product_id: prod_xyz789

stripe prices create --product=prod_xyz789 --unit-amount=4990 --currency=brl --recurring-interval=month
# price_id: price_family_monthly
```

### 3. Configurar Webhook

1. Dashboard Stripe → Developers → Webhooks
2. Add endpoint: `https://financeiro-api.workers.dev/api/billing/webhook`
3. Selecionar eventos:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiar **Webhook signing secret**

### 4. Atualizar Código

Em `apps/api/src/routes/billing.ts`:

```typescript
const priceIds: Record<string, string> = {
  PRO: 'price_pro_monthly',    // Colar price_id real
  FAMILY: 'price_family_monthly',
};
```

### 5. Configurar Secrets

```bash
# Stripe Secret Key (Dashboard → Developers → API keys)
wrangler secret put STRIPE_SECRET_KEY
# Colar sk_live_...

# Webhook Secret
wrangler secret put STRIPE_WEBHOOK_SECRET
# Colar whsec_...
```

---

## Gating de Features

### Middleware requirePlan

```typescript
import { requirePlan } from './middleware/auth';

// Bloquear feature para FREE
app.post('/premium-feature',
  requireAuth,
  requirePlan(['PRO', 'FAMILY']),
  async (c) => {
    // Só PRO e FAMILY entram aqui
  }
);
```

### Exemplo: Processamento IA

```typescript
// apps/api/src/routes/invoices.ts
app.post('/:id/process',
  requirePlan(['PRO', 'FAMILY']),  // GATING
  async (c) => {
    // Processar fatura com IA
  }
);
```

**Response se FREE tentar acessar:**
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

## Gating no Frontend

### Verificar Plano

```typescript
const { data } = await api.get('/api/auth/me');

if (data.plan === 'FREE') {
  // Mostrar banner "Upgrade para desbloquear IA"
  showUpgradeModal();
} else {
  // Permitir usar feature
  processInvoiceWithAI();
}
```

### Componente de Upgrade

```tsx
function UpgradeButton({ feature }: { feature: string }) {
  const { user } = useAuth();

  if (user.plan !== 'FREE') return null;

  return (
    <div className="upgrade-banner">
      <p>🔒 {feature} é exclusivo para PRO e FAMILY</p>
      <button onClick={handleUpgrade}>
        Upgrade para PRO
      </button>
    </div>
  );
}
```

---

## Segurança

### Validação de Assinatura Webhook

```typescript
async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  // Extrai timestamp e signature
  const [timestamp, expectedSig] = signature.split(',')
    .map(p => p.split('=')[1]);

  // Reconstrói payload assinado
  const signedPayload = `${timestamp}.${payload}`;

  // Verifica HMAC-SHA256
  const computedSig = await hmacSHA256(signedPayload, secret);

  return computedSig === expectedSig;
}
```

**Importante:**
- Webhook sem validação de assinatura = vulnerabilidade crítica
- Sempre validar `Stripe-Signature` header

### Proteção contra Replay

- Webhook events têm ID único
- Processar evento apenas uma vez
- Verificar timestamp (rejeitar eventos antigos)

---

## Testes

### Testar Checkout (Teste)

```bash
# Criar checkout
curl -X POST http://localhost:8787/api/billing/checkout \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{"plan":"PRO"}'
```

### Testar Webhook Localmente

1. Instalar Stripe CLI:
```bash
stripe listen --forward-to localhost:8787/api/billing/webhook
```

2. Trigger evento de teste:
```bash
stripe trigger checkout.session.completed
```

3. Ver logs:
```bash
# No terminal do wrangler dev
```

### Cartões de Teste Stripe

- **Sucesso**: `4242 4242 4242 4242`
- **Falha**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0027 6000 3184`

Qualquer CVC, data futura, qualquer nome.

---

## Banco de Dados

### Tabela `subscriptions`

```sql
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
  canceled_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

### Atualização de `users`

```sql
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
```

---

## Checklist de Implementação

- [x] Endpoint de checkout
- [x] Webhook handler
- [x] Validação de assinatura webhook
- [x] Atualização de plano em users
- [x] Tabela subscriptions
- [x] Middleware requirePlan
- [x] Gating em /invoices/:id/process
- [x] Endpoint de cancelamento
- [x] Audit logs de billing

---

## Próximos Passos

1. **Trials**: Oferecer 7 dias grátis de PRO
2. **Cupons**: Descontos e promoções
3. **Upgrades/Downgrades**: Permitir trocar plano
4. **Histórico de faturas**: Listar invoices do Stripe
5. **Customer Portal**: Stripe Customer Portal para autogestão
6. **Análise**: Métricas de MRR, churn, LTV

---

## Links Úteis

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe Docs - Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Docs - Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

**Billing Stripe pronto para produção e vendável como SaaS!**
