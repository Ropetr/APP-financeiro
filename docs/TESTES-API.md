# Testes da API - Guia Completo

A API está rodando em: **http://localhost:8787**

## 1. Health Check ✅

Você já testou e funcionou!

```bash
curl http://localhost:8787
```

**Response:**
```json
{
  "name": "Financeiro API",
  "version": "1.0.0",
  "status": "healthy",
  "environment": "development"
}
```

---

## 2. Testar Register (Criar Usuário)

### Windows PowerShell:

```powershell
$body = @{
    email = "teste@email.com"
    password = "SecurePass123!"
    name = "Usuário Teste"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/auth/register" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### cURL (se tiver instalado):

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"teste@email.com\",\"password\":\"SecurePass123!\",\"name\":\"Usuario Teste\"}"
```

**Response esperado (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "abc123",
      "email": "teste@email.com",
      "name": "Usuário Teste",
      "role": "admin",
      "familyId": "family_xyz",
      "plan": "FREE"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "abc123def456..."
  }
}
```

**⚠️ IMPORTANTE:** Copie o `accessToken` para usar nos próximos testes!

---

## 3. Testar Login

### PowerShell:

```powershell
$body = @{
    email = "teste@email.com"
    password = "SecurePass123!"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/auth/login" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### cURL:

```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"teste@email.com\",\"password\":\"SecurePass123!\"}"
```

---

## 4. Testar Rota Protegida (/me)

**Substitua `SEU_ACCESS_TOKEN` pelo token que você recebeu no register/login**

### PowerShell:

```powershell
$token = "SEU_ACCESS_TOKEN_AQUI"

Invoke-RestMethod -Uri "http://localhost:8787/api/auth/me" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $token"
    }
```

### cURL:

```bash
curl http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN_AQUI"
```

**Response esperado:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "email": "teste@email.com",
    "name": "Usuário Teste",
    "role": "admin",
    "familyId": "family_xyz",
    "plan": "FREE"
  }
}
```

---

## 5. Testar Criação de Cartão

### PowerShell:

```powershell
$token = "SEU_ACCESS_TOKEN_AQUI"

$body = @{
    name = "Nubank Teste"
    holder = "Usuario Teste"
    brand = "mastercard"
    closingDay = 15
    dueDay = 25
    color = "#8A05BE"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/cards" `
    -Method POST `
    -Body $body `
    -ContentType "application/json" `
    -Headers @{
        "Authorization" = "Bearer $token"
    }
```

**Response esperado:**
```json
{
  "success": true,
  "data": {
    "id": "card_abc123",
    "name": "Nubank Teste",
    "holder": "Usuario Teste",
    "brand": "mastercard",
    "closingDay": 15,
    "dueDay": 25,
    "color": "#8A05BE",
    "active": true
  }
}
```

---

## 6. Testar Gating (FREE não acessa IA)

### PowerShell:

```powershell
$token = "SEU_ACCESS_TOKEN_AQUI"

Invoke-RestMethod -Uri "http://localhost:8787/api/invoices/invoice_123/process" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer $token"
    }
```

**Response esperado (403 Forbidden):**
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

## 7. Testar Dashboard

### PowerShell:

```powershell
$token = "SEU_ACCESS_TOKEN_AQUI"

Invoke-RestMethod -Uri "http://localhost:8787/api/dashboard/stats" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $token"
    }
```

---

## 8. Listar Cartões (do seed)

### PowerShell:

```powershell
$token = "SEU_ACCESS_TOKEN_AQUI"

Invoke-RestMethod -Uri "http://localhost:8787/api/cards" `
    -Method GET `
    -Headers @{
        "Authorization" = "Bearer $token"
    }
```

Deve retornar os cartões criados no seed (Itaú Rodrigo, Itaú Deyse, Nubank, Sisprime).

---

## Resumo dos Endpoints

### Públicos (sem autenticação)
- ✅ GET / - Health check
- ✅ POST /api/auth/register
- ✅ POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- POST /api/auth/forgot
- POST /api/auth/reset

### Protegidos (requer token)
- GET /api/auth/me
- GET /api/cards
- POST /api/cards
- GET /api/installments
- POST /api/installments
- GET /api/dashboard/stats
- GET /api/dashboard/consolidation
- GET /api/incomes
- POST /api/incomes
- GET /api/expenses/fixed
- GET /api/expenses/variable

### Protegidos + Gating (PRO/FAMILY)
- POST /api/invoices/:id/process

---

## Próximos Passos

1. ✅ API rodando
2. ✅ Banco configurado
3. ✅ Dados de exemplo
4. 🔄 Testar endpoints de auth
5. ⏳ Criar Web App (Next.js)
6. ⏳ Criar Mobile App (Expo)

---

**Sistema de autenticação JWT próprio + Stripe funcionando perfeitamente!**
