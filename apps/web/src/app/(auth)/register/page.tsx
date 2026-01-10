'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth'
import { CreditCard, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, clearError } = useAuthStore()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setLocalError('')

    if (password !== confirmPassword) {
      setLocalError('As senhas não coincidem')
      return
    }

    if (password.length < 8) {
      setLocalError('A senha deve ter no mínimo 8 caracteres')
      return
    }

    try {
      await register(email, password, name)
      router.push('/dashboard')
    } catch (err) {
      // Error já está no store
    }
  }

  const displayError = localError || error

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">
            Financeiro
          </h1>
          <p className="text-secondary-600">
            Crie sua conta gratuita
          </p>
        </div>

        {/* Card de Registro */}
        <div className="card">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6">
            Criar Conta
          </h2>

          {displayError && (
            <div className="mb-4 p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Nome Completo
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="João Silva"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                disabled={isLoading}
                minLength={8}
              />
              <p className="mt-1 text-xs text-secondary-500">
                Mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número, 1 caractere especial
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirmar Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando conta...
                </>
              ) : (
                'Criar Conta'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-secondary-600">
            Já tem uma conta?{' '}
            <Link
              href="/login"
              className="text-primary-600 font-medium hover:text-primary-700 hover:underline"
            >
              Entrar
            </Link>
          </div>
        </div>

        <div className="mt-4 card bg-primary-50 border-primary-200">
          <h3 className="text-sm font-semibold text-primary-900 mb-2">
            Plano FREE Incluído
          </h3>
          <ul className="text-xs text-primary-800 space-y-1">
            <li>✓ Gestão ilimitada de cartões</li>
            <li>✓ Controle de parcelas</li>
            <li>✓ Projeção de 12 meses</li>
            <li>✓ Orçamento familiar</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
