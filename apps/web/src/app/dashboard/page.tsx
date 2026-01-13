'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { formatCurrency } from '@/lib/utils'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Calendar,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [currentMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Mock data (em produção virá da API)
  const stats = {
    totalCards: 4,
    monthlyIncome: 15000,
    monthlyExpenses: 16699.99,
    availableBalance: -1699.99,
    installmentsCount: 45,
    percentageUsed: 111.3,
  }

  const recentInstallments = [
    { id: '1', merchant: 'Nutricionista', value: 450, card: 'Nubank Deyse', installment: '2/12' },
    { id: '2', merchant: 'Amazon', value: 119.90, card: 'Itaú Rodrigo', installment: '1/3' },
    { id: '3', merchant: 'Mercado Livre', value: 89.90, card: 'C6 Deyse', installment: '5/10' },
  ]

  const isOverBudget = stats.availableBalance < 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary-900">
          Dashboard
        </h1>
        <p className="text-secondary-600 mt-1">
          Visão geral das suas finanças familiares
        </p>
      </div>

      {/* Alert se estiver acima do orçamento */}
      {isOverBudget && (
        <div className="card bg-danger/5 border-danger/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-danger mb-1">
                Orçamento Excedido
              </h3>
              <p className="text-sm text-danger/80">
                Suas despesas estão {stats.percentageUsed.toFixed(1)}% da renda mensal.
                Você está <strong>{formatCurrency(Math.abs(stats.availableBalance))}</strong> acima do orçamento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receitas */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <Calendar className="w-4 h-4 text-secondary-400" />
          </div>
          <h3 className="text-sm font-medium text-secondary-600 mb-1">
            Receitas do Mês
          </h3>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(stats.monthlyIncome)}
          </p>
        </div>

        {/* Despesas */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-primary-50 rounded-lg">
              <TrendingDown className="w-5 h-5 text-primary-600" />
            </div>
            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
              {stats.percentageUsed.toFixed(1)}%
            </span>
          </div>
          <h3 className="text-sm font-medium text-secondary-600 mb-1">
            Despesas do Mês
          </h3>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(stats.monthlyExpenses)}
          </p>
        </div>

        {/* Saldo Disponível */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-danger/10' : 'bg-info/10'}`}>
              <DollarSign className={`w-5 h-5 ${isOverBudget ? 'text-danger' : 'text-info'}`} />
            </div>
          </div>
          <h3 className="text-sm font-medium text-secondary-600 mb-1">
            {isOverBudget ? 'Déficit' : 'Saldo Disponível'}
          </h3>
          <p className={`text-2xl font-bold ${isOverBudget ? 'text-danger' : 'text-info'}`}>
            {formatCurrency(Math.abs(stats.availableBalance))}
          </p>
        </div>

        {/* Cartões Ativos */}
        <div className="card">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-secondary-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-secondary-700" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-secondary-600 mb-1">
            Cartões Ativos
          </h3>
          <p className="text-2xl font-bold text-secondary-900">
            {stats.totalCards}
          </p>
          <p className="text-xs text-secondary-500 mt-1">
            {stats.installmentsCount} parcelas em aberto
          </p>
        </div>
      </div>

      {/* Parcelas Recentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-secondary-900">
            Parcelas Recentes
          </h2>
          <a href="/installments" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Ver todas →
          </a>
        </div>

        <div className="space-y-3">
          {recentInstallments.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 rounded-lg border border-secondary-200 hover:border-primary-200 hover:bg-primary-50/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="font-medium text-secondary-900">{item.merchant}</p>
                  <p className="text-sm text-secondary-500">
                    {item.card} • Parcela {item.installment}
                  </p>
                </div>
              </div>
              <p className="text-lg font-semibold text-primary-600">
                {formatCurrency(item.value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Info sobre o plano */}
      {user?.plan === 'FREE' && (
        <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-900 mb-1">
                Upgrade para PRO
              </h3>
              <p className="text-sm text-primary-800 mb-3">
                Desbloqueie análise de faturas com IA, múltiplas famílias e relatórios avançados.
              </p>
              <button className="btn btn-primary text-sm">
                Ver Planos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
