# Autenticação JWT Própria - Documentação Completa

Sistema de autenticação vendável com JWT, PBKDF2, refresh tokens com rotação, reset de senha e audit logs.

## Visão Geral

- **Hash de senha**: PBKDF2-SHA256 com 150.000 iterações
- **Access token (JWT)**: 15 minutos
- **Refresh token**: 30 dias com rotação automática
- **Rate limiting**: Proteção contra brute force
- **Audit logs**: Rastreamento completo de ações
- **Multi-tenant**: Isolamento por familyId

## Endpoints

### POST /api/auth/register

Cria nova conta de usuário.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "João Silva"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "abc123",
      "email": "user@example.com",
      "name": "João Silva",
      "role": "admin",
      "familyId": "family_xyz",
      "plan": "FREE"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "abc123def456..."
  }
}
```

**Validações:**
- Email válido
- Senha mínima: 8 caracteres
- Senha deve conter: maiúscula, minúscula, número e especial
- Rate limit: 5 tentativas/minuto

---

### POST /api/auth/login

Autentica usuário existente.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "abc123",
      "email": "user@example.com",
      "name": "João Silva",
      "role": "admin",
      "familyId": "family_xyz",
      "plan": "FREE"
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "def789ghi012..."
  }
}
```

**Erros:**
- **401**: Credenciais inválidas
- **429**: Rate limit excedido (5 tentativas/minuto)

---

### POST /api/auth/refresh

Renova access token usando refresh token (com rotação).

**Request:**
```json
{
  "refreshToken": "def789ghi012..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "jkl345mno678..."
  }
}
```

**Comportamento:**
- O refresh token antigo é revogado
- Um novo refresh token é emitido (rotação)
- O access token é renovado

**Erros:**
- **401**: Refresh token inválido, revogado ou expirado

---

### POST /api/auth/logout

Revoga refresh token (invalida sessão).

**Request:**
```json
{
  "refreshToken": "jkl345mno678..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

### POST /api/auth/forgot

Solicita reset de senha (gera token de reset).

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Se o email existir, você receberá instruções para redefinir a senha"
}
```

**Desenvolvimento apenas:**
```json
{
  "success": true,
  "message": "...",
  "resetToken": "pqr567stu890..."
}
```

**Segurança:**
- Sempre retorna sucesso (não vaza se o email existe)
- Token expira em 1 hora
- Rate limit: 3 tentativas/minuto, bloqueio de 1 hora

---

### POST /api/auth/reset

Redefine senha usando token de reset.

**Request:**
```json
{
  "token": "pqr567stu890...",
  "newPassword": "NewSecurePass456!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Senha redefinida com sucesso"
}
```

**Comportamento:**
- Todas as sessões do usuário são revogadas
- Token de reset é marcado como usado
- Valida força da nova senha

**Erros:**
- **400**: Token inválido, expirado ou já usado
- **400**: Senha fraca

---

### GET /api/auth/me

Retorna dados do usuário autenticado.

**Headers:**
```
Authorization: Bearer eyJhbGc...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "email": "user@example.com",
    "name": "João Silva",
    "role": "admin",
    "familyId": "family_xyz",
    "plan": "PRO"
  }
}
```

**Erros:**
- **401**: Token ausente, inválido ou expirado

---

## Uso em Clients (Web/Mobile)

### Armazenamento de Tokens

**Web (Next.js):**
- **Refresh token**: HttpOnly cookie (ideal) ou localStorage (MVP)
- **Access token**: Memória (ideal) ou localStorage (MVP)

**Mobile (Expo):**
- **Refresh token**: SecureStore (criptografado)
- **Access token**: Memória + renovação automática

### Interceptor Axios (Renovação Automática)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.financeiro.com',
});

let accessToken = '';
let refreshToken = '';

// Request interceptor (anexa access token)
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor (renova em 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken,
        });

        accessToken = data.data.accessToken;
        refreshToken = data.data.refreshToken;

        // Salvar novos tokens
        localStorage.setItem('refreshToken', refreshToken);

        // Repetir request original
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh falhou, redirecionar para login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Segurança Implementada

### Hash de Senha
- Algoritmo: **PBKDF2-SHA256**
- Iterações: **150.000** (ajustável)
- Salt: **16 bytes aleatórios** (único por usuário)

### Tokens
- **Access JWT**: 15 minutos, assinado com HS256
- **Refresh opaco**: 32 bytes aleatórios, hasheado com SHA-256

### Rate Limiting
- **Login/Register**: 5 tentativas/min → bloqueio 15 min
- **Reset**: 3 tentativas/min → bloqueio 1 hora

### Audit Logs
Todas as ações críticas são registradas:
- `user.register`
- `user.login`
- `user.login_failed`
- `user.password_reset_requested`
- `user.password_reset`

### Proteção contra Ataques
- **Brute force**: Rate limiting + bloqueio progressivo
- **Token replay**: Refresh tokens hasheados e com rotação
- **Session hijacking**: Revogação de sessões em reset de senha
- **Timing attacks**: Respostas constantes (email exists check)

---

## Middlewares

### requireAuth

Valida JWT e anexa user ao contexto.

```typescript
import { requireAuth } from './middleware/auth';

app.get('/protected', requireAuth, async (c) => {
  const user = getAuthUser(c);
  return c.json({ message: `Hello ${user.name}` });
});
```

### requirePlan(allowedPlans)

Gating por plano (FREE/PRO/FAMILY).

```typescript
import { requirePlan } from './middleware/auth';

app.post('/premium-feature', requireAuth, requirePlan(['PRO', 'FAMILY']), async (c) => {
  // Apenas PRO e FAMILY acessam
});
```

### requireRole(allowedRoles)

Gating por role (admin/member).

```typescript
import { requireRole } from './middleware/auth';

app.delete('/admin-action', requireAuth, requireRole(['admin']), async (c) => {
  // Apenas admins acessam
});
```

---

## Configuração

### Variáveis de Ambiente (wrangler.toml)

```toml
[vars]
ENVIRONMENT = "development"
JWT_SECRET = "dev-secret-change-in-production"
```

### Produção (secrets)

```bash
# Definir JWT_SECRET em produção
wrangler secret put JWT_SECRET

# Inserir um secret forte (ex: 64+ caracteres aleatórios)
```

**Gerar secret forte:**
```bash
openssl rand -base64 64
```

---

## Migrations

Aplicar migration de auth:

```bash
cd apps/api
wrangler d1 execute financeiro-db --local --file=../../packages/database/migrations/0002_auth.sql
```

Produção:
```bash
wrangler d1 execute financeiro-db --file=../../packages/database/migrations/0002_auth.sql
```

---

## Checklist de Implementação

- [x] PBKDF2-SHA256 (150k iterações)
- [x] Access JWT (15 min)
- [x] Refresh token opaco (30 dias)
- [x] Rotação de refresh token
- [x] Rate limiting (login, register, reset)
- [x] Audit logs
- [x] Reset de senha com token
- [x] Middleware requireAuth
- [x] Middleware requirePlan
- [x] Middleware requireRole
- [x] Revogação de sessões

---

## Próximos Passos

1. **Email**: Integrar serviço de email para reset de senha (Resend, SendGrid, etc)
2. **MFA**: Adicionar autenticação de dois fatores (TOTP)
3. **OAuth**: Adicionar login social (Google, GitHub)
4. **Device tracking**: Registrar e gerenciar dispositivos conhecidos
5. **IP whitelisting**: Restringir acesso por IP (enterprise)

---

## Testando

### Criar usuário
```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'
```

### Login
```bash
curl -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

### Acessar rota protegida
```bash
curl -X GET http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

---

**Autenticação JWT pronta para produção e vendável como SaaS!**
