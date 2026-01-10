# Sistema de Gestão Financeira Familiar

Sistema completo de gestão financeira com controle de cartões, parcelamentos, orçamento familiar e planejamento anual com IA.

## Visão Geral

Este sistema foi desenvolvido para controlar de forma precisa e automatizada:
- Cartões de crédito múltiplos
- Parcelas futuras e atuais
- Orçamento familiar completo
- Receitas (com 13º salário)
- Despesas fixas e variáveis
- Planejamento anual
- Análise automática de faturas com IA

## Arquitetura

### Stack Tecnológica

- **Frontend Web**: Next.js 15 + TypeScript + Tailwind CSS
- **Mobile**: React Native + Expo
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **IA**: Cloudflare AI Workers
- **Monorepo**: Turborepo + pnpm

### Estrutura do Projeto

```
├── apps/
│   ├── web/          # Aplicação web (Next.js)
│   ├── mobile/       # App Android (React Native)
│   └── api/          # API (Cloudflare Workers)
├── packages/
│   ├── database/     # Schema + Drizzle ORM
│   ├── ui/           # Componentes UI compartilhados
│   └── types/        # TypeScript types compartilhados
└── docs/            # Documentação
```

## Começando

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- Cloudflare Account (para deploy)

### Instalação

```bash
# Instalar dependências
pnpm install

# Rodar todos os ambientes de desenvolvimento
pnpm dev

# Rodar apenas web
pnpm web:dev

# Rodar apenas mobile
pnpm mobile:dev

# Rodar apenas API
pnpm api:dev
```

## Conceitos Financeiros

### Modelo de Parcelas Reais

Este sistema **NÃO** trabalha com estimativas. Trabalha exclusivamente com:
- Parcelas reais e conhecidas
- Datas reais de vencimento
- Valores reais de compromisso
- Obrigações financeiras futuras

### Módulos Principais

1. **Parcelas por Cartão** - Tabela-mãe com todas as obrigações futuras
2. **Consolidado Mensal** - Visão agregada mensal
3. **Orçamento Familiar** - Receitas e despesas
4. **Planejamento Anual** - Projeção de 12 meses
5. **Dashboard** - Visualização executiva

### IA para Faturas

O sistema usa IA para:
- Extrair dados de faturas (PDF/imagem)
- Identificar parcelas automaticamente
- Atualizar parcelas existentes
- Encerrar parcelas finalizadas
- Alertar sobre riscos financeiros

## Deploy

```bash
# Build de produção
pnpm build

# Deploy web (Cloudflare Pages)
cd apps/web && pnpm deploy

# Deploy API (Cloudflare Workers)
cd apps/api && pnpm deploy
```

## Licença

Proprietário - Todos os direitos reservados

## Contato

Este é um produto SaaS em desenvolvimento.
