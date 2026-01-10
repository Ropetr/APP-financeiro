/**
 * API Client para comunicação com o backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    const data: ApiResponse<T> = await response.json()

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error?.message || 'Erro desconhecido',
        response.status,
        data.error?.code
      )
    }

    return data.data as T
  }

  // Auth
  async register(email: string, password: string, name: string) {
    return this.request<{
      user: {
        id: string
        email: string
        name: string
        role: string
        familyId: string
        plan: string
      }
      accessToken: string
      refreshToken: string
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  async login(email: string, password: string) {
    return this.request<{
      user: {
        id: string
        email: string
        name: string
        role: string
        familyId: string
        plan: string
      }
      accessToken: string
      refreshToken: string
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async me() {
    return this.request<{
      id: string
      email: string
      name: string
      role: string
      familyId: string
      plan: string
    }>('/api/auth/me')
  }

  async logout(refreshToken: string) {
    return this.request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  }

  // Cards
  async getCards() {
    return this.request<any[]>('/api/cards')
  }

  async createCard(data: any) {
    return this.request('/api/cards', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCard(id: string, data: any) {
    return this.request(`/api/cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCard(id: string) {
    return this.request(`/api/cards/${id}`, {
      method: 'DELETE',
    })
  }

  // Installments
  async getInstallments(filters?: { month?: string; cardId?: string }) {
    const params = new URLSearchParams(filters as any)
    return this.request<any[]>(`/api/installments?${params}`)
  }

  async createInstallment(data: any) {
    return this.request('/api/installments', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInstallment(id: string, data: any) {
    return this.request(`/api/installments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInstallment(id: string) {
    return this.request(`/api/installments/${id}`, {
      method: 'DELETE',
    })
  }

  // Dashboard
  async getDashboard(year: number) {
    return this.request<any>(`/api/dashboard/${year}`)
  }
}

export const api = new ApiClient(API_URL)
