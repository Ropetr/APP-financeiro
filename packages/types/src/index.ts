/**
 * Types compartilhados entre web, mobile e API
 */

// ========== API Response Types ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ========== Dashboard Types ==========

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  totalCards: number;
  activeInstallments: number;
  monthlyBalance: number;
  yearlyProjection: number;
}

export interface MonthlyConsolidation {
  month: string; // YYYY-MM
  cards: {
    cardId: string;
    cardName: string;
    total: number;
  }[];
  totalMonth: number;
}

export interface BudgetSummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalFixedExpenses: number;
  totalVariableExpenses: number;
  totalCards: number;
  balanceBeforeCards: number;
  finalBalance: number;
  commitmentPercentage: number; // % da renda comprometida
}

export interface AnnualPlanning {
  months: BudgetSummary[];
  totalYear: {
    income: number;
    expenses: number;
    cards: number;
    balance: number;
  };
}

// ========== Chart Data Types ==========

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface TimeSeriesData {
  month: string;
  income: number;
  expenses: number;
  cards: number;
  balance: number;
}

// ========== Installment Types ==========

export type InstallmentType = 'installment' | 'balance' | 'recurring' | 'single';

export interface InstallmentWithCard {
  id: string;
  merchant: string;
  description?: string;
  category?: string;
  installmentValue: number;
  currentInstallment: number;
  totalInstallments: number;
  totalValue: number;
  startMonth: string;
  endMonth: string;
  type: InstallmentType;
  active: boolean;
  paid: boolean;
  card: {
    id: string;
    name: string;
    holder: string;
    color: string;
  };
}

export interface InstallmentCreateDTO {
  cardId: string;
  merchant: string;
  description?: string;
  category?: string;
  installmentValue: number;
  currentInstallment: number;
  totalInstallments: number;
  totalValue: number;
  startMonth: string;
  type?: InstallmentType;
}

// ========== Card Types ==========

export interface CreditCardDTO {
  id: string;
  name: string;
  holder: string;
  brand?: string;
  color: string;
  closingDay: number;
  dueDay: number;
  limit?: number;
  active: boolean;
  currentBalance?: number; // calculado dinamicamente
  availableLimit?: number; // calculado dinamicamente
}

export interface CreditCardCreateDTO {
  name: string;
  holder: string;
  brand?: string;
  color?: string;
  closingDay: number;
  dueDay: number;
  limit?: number;
}

// ========== Income Types ==========

export type IncomeType = 'fixed' | 'variable';

export interface IncomeDTO {
  id: string;
  source: string;
  responsible: string;
  type: IncomeType;
  monthlyValue: number;
  has13th: boolean;
  base13th?: number;
  active: boolean;
}

export interface IncomeCreateDTO {
  source: string;
  responsible: string;
  type: IncomeType;
  monthlyValue: number;
  has13th?: boolean;
  base13th?: number;
}

// ========== Expense Types ==========

export interface FixedExpenseDTO {
  id: string;
  name: string;
  category: string;
  monthlyValue: number;
  isAnnual: boolean;
  annualMonth?: string;
  annualValue?: number;
  dueDay?: number;
  active: boolean;
}

export interface FixedExpenseCreateDTO {
  name: string;
  category: string;
  monthlyValue: number;
  isAnnual?: boolean;
  annualMonth?: string;
  annualValue?: number;
  dueDay?: number;
}

export interface VariableExpenseDTO {
  id: string;
  name: string;
  category: string;
  averageValue: number;
  active: boolean;
}

export interface VariableExpenseCreateDTO {
  name: string;
  category: string;
  averageValue: number;
}

// ========== Invoice Types ==========

export type InvoiceStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface InvoiceDTO {
  id: string;
  cardId: string;
  cardName: string;
  fileName: string;
  fileSize: number;
  referenceMonth: string;
  status: InvoiceStatus;
  totalValue?: number;
  dueDate?: string;
  closingDate?: string;
  aiProcessedAt?: Date;
  aiError?: string;
  createdAt: Date;
}

export interface InvoiceUploadDTO {
  cardId: string;
  referenceMonth: string;
  file: File | Blob;
}

export interface InvoiceAIResult {
  totalValue: number;
  dueDate: string;
  closingDate: string;
  installments: {
    merchant: string;
    description: string;
    currentInstallment: number;
    totalInstallments: number;
    installmentValue: number;
    totalValue: number;
  }[];
}

// ========== Vehicle Types ==========

export type VehicleType = 'car' | 'motorcycle' | 'other';

export interface VehicleDTO {
  id: string;
  name: string;
  type: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  ipvaValue?: number;
  ipvaMonth?: string;
  licensingValue?: number;
  licensingMonth?: string;
  active: boolean;
}

export interface VehicleCreateDTO {
  name: string;
  type: VehicleType;
  brand?: string;
  model?: string;
  year?: number;
  ipvaValue?: number;
  ipvaMonth?: string;
  licensingValue?: number;
  licensingMonth?: string;
}

// ========== User & Family Types ==========

export type UserRole = 'admin' | 'member';

export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  familyId: string;
}

export interface FamilyDTO {
  id: string;
  name: string;
  members: UserDTO[];
}

// ========== Filter & Sort Types ==========

export interface DateRange {
  startMonth: string;
  endMonth: string;
}

export interface FilterOptions {
  cardId?: string;
  category?: string;
  type?: InstallmentType;
  active?: boolean;
  paid?: boolean;
  dateRange?: DateRange;
}

export type SortDirection = 'asc' | 'desc';

export interface SortOptions {
  field: string;
  direction: SortDirection;
}

// ========== Utility Types ==========

export interface MonthYear {
  year: number;
  month: number; // 1-12
  formatted: string; // YYYY-MM
}

export function parseMonthYear(monthStr: string): MonthYear {
  const [year, month] = monthStr.split('-').map(Number);
  return {
    year,
    month,
    formatted: monthStr,
  };
}

export function formatMonthYear(year: number, month: number): string {
  return `${year}-${month.toString().padStart(2, '0')}`;
}

export function addMonths(monthStr: string, count: number): string {
  const date = new Date(monthStr + '-01');
  date.setMonth(date.getMonth() + count);
  return date.toISOString().substring(0, 7);
}

export function monthDiff(start: string, end: string): number {
  const startDate = new Date(start + '-01');
  const endDate = new Date(end + '-01');

  const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  return months;
}

export function generateMonthRange(start: string, end: string): string[] {
  const months: string[] = [];
  let current = new Date(start + '-01');
  const endDate = new Date(end + '-01');

  while (current <= endDate) {
    months.push(current.toISOString().substring(0, 7));
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

// ========== Formatters ==========

export function formatCurrency(value: number, locale: string = 'pt-BR', currency: string = 'BRL'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(date: Date | string, locale: string = 'pt-BR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale).format(d);
}

export function formatMonthName(monthStr: string, locale: string = 'pt-BR'): string {
  const date = new Date(monthStr + '-01');
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

// ========== Validation ==========

export function isValidMonthFormat(monthStr: string): boolean {
  return /^\d{4}-\d{2}$/.test(monthStr);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ========== Constants ==========

export const EXPENSE_CATEGORIES = [
  'moradia',
  'alimentacao',
  'transporte',
  'educacao',
  'saude',
  'lazer',
  'vestuario',
  'servicos',
  'impostos',
  'seguros',
  'outros',
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const INCOME_SOURCES = [
  'salario',
  'pro-labore',
  'autonomo',
  'investimentos',
  'aluguel',
  'pensao',
  'outros',
] as const;

export type IncomeSource = typeof INCOME_SOURCES[number];

export const CARD_BRANDS = [
  'visa',
  'mastercard',
  'elo',
  'amex',
  'hipercard',
  'outros',
] as const;

export type CardBrand = typeof CARD_BRANDS[number];

export const COLORS = {
  primary: '#6366f1',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  neutral: '#6b7280',
} as const;
