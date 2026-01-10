# Web App - Financeiro

Sistema de gestão financeira familiar com tema vermelho.

## 🚀 Como Rodar

```bash
# 1. Instalar dependências (se ainda não fez)
pnpm install

# 2. Copiar arquivo de ambiente
cp .env.local.example .env.local

# 3. Iniciar servidor de desenvolvimento
pnpm dev

# Acessar: http://localhost:3000
```

## 📁 Estrutura

```
src/
├── app/              # App Router do Next.js 15
│   ├── (auth)/       # Grupo de rotas de autenticação
│   │   ├── login/    # Página de login
│   │   └── register/ # Página de registro
│   └── dashboard/    # Dashboard protegido
├── components/       # Componentes React
├── lib/              # Utilitários e API client
└── store/            # Estado global (Zustand)
```

## 🎨 Tema

**Cor Principal:** Vermelho (#dc2626)

- Botões, links e destaques em vermelho
- Alertas de déficit em vermelho
- Cards brancos com bordas sutis
- Gradientes suaves

## 🔐 Autenticação

- JWT armazenado no localStorage via Zustand
- Proteção automática de rotas
- Redirect para /login se não autenticado
- Token enviado automaticamente nos requests

## 📊 Dados de Teste

**Usuário:**
- Email: teste@email.com
- Senha: SecurePass123!

Ou crie uma nova conta em /register

## 🛠️ Tecnologias

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Zustand (state)
- Lucide React (icons)

## 📦 Scripts

```bash
pnpm dev      # Desenvolvimento
pnpm build    # Build de produção
pnpm start    # Servidor de produção
pnpm lint     # Linter
```

## 🎯 Status

- ✅ Autenticação (login/register)
- ✅ Dashboard com visão geral
- ✅ Sidebar com navegação
- ⏳ Gestão de cartões
- ⏳ Gestão de parcelas
- ⏳ Projeção anual

---

**Importante:** Certifique-se que a API está rodando em http://localhost:8787
