import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * Funções utilitárias para cálculos financeiros
 */

/**
 * Calcula o consolidado mensal de cartões
 * Retorna o total por cartão para cada mês
 */
export async function getMonthlyConsolidation(
  db: DrizzleD1Database,
  familyId: string,
  startMonth: string,
  endMonth: string
) {
  const installments = await db
    .select()
    .from(schema.installments)
    .where(
      and(
        eq(schema.installments.familyId, familyId),
        eq(schema.installments.active, true),
        gte(schema.installments.startMonth, startMonth),
        lte(schema.installments.endMonth, endMonth)
      )
    )
    .all();

  // Agrupa por mês e cartão
  const consolidation: Record<string, Record<string, number>> = {};

  installments.forEach((inst) => {
    const start = new Date(inst.startMonth + '-01');
    const end = new Date(inst.endMonth + '-01');

    let current = new Date(start);
    while (current <= end) {
      const monthKey = current.toISOString().substring(0, 7);

      if (!consolidation[monthKey]) {
        consolidation[monthKey] = {};
      }

      if (!consolidation[monthKey][inst.cardId]) {
        consolidation[monthKey][inst.cardId] = 0;
      }

      consolidation[monthKey][inst.cardId] += inst.installmentValue;

      current.setMonth(current.getMonth() + 1);
    }
  });

  return consolidation;
}

/**
 * Calcula o orçamento mensal
 * Retorna receitas, despesas e saldo
 */
export async function getMonthlyBudget(
  db: DrizzleD1Database,
  familyId: string,
  month: string
) {
  // Receitas
  const incomes = await db
    .select()
    .from(schema.incomes)
    .where(
      and(
        eq(schema.incomes.familyId, familyId),
        eq(schema.incomes.active, true)
      )
    )
    .all();

  // Despesas fixas
  const fixedExpenses = await db
    .select()
    .from(schema.fixedExpenses)
    .where(
      and(
        eq(schema.fixedExpenses.familyId, familyId),
        eq(schema.fixedExpenses.active, true)
      )
    )
    .all();

  // Despesas variáveis
  const variableExpenses = await db
    .select()
    .from(schema.variableExpenses)
    .where(
      and(
        eq(schema.variableExpenses.familyId, familyId),
        eq(schema.variableExpenses.active, true)
      )
    )
    .all();

  // Cálculo de 13º salário
  const monthNumber = parseInt(month.split('-')[1]);
  const is13thMonth = monthNumber === 11 || monthNumber === 12;
  const thirteenthPercentage = monthNumber === 11 ? 0.5 : monthNumber === 12 ? 0.5 : 0;

  let totalIncome = 0;
  incomes.forEach((income) => {
    totalIncome += income.monthlyValue;

    if (is13thMonth && income.has13th) {
      const base13th = income.base13th || income.monthlyValue;
      totalIncome += base13th * thirteenthPercentage;
    }
  });

  const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => {
    if (exp.isAnnual && exp.annualMonth === month) {
      return sum + (exp.annualValue || 0);
    }
    return sum + exp.monthlyValue;
  }, 0);

  const totalVariableExpenses = variableExpenses.reduce(
    (sum, exp) => sum + exp.averageValue,
    0
  );

  return {
    totalIncome,
    totalFixedExpenses,
    totalVariableExpenses,
    balanceBeforeCards: totalIncome - totalFixedExpenses - totalVariableExpenses,
  };
}

/**
 * Gera o planejamento anual (12 meses)
 */
export async function getAnnualPlanning(
  db: DrizzleD1Database,
  familyId: string,
  startMonth: string
) {
  const planning = [];

  const start = new Date(startMonth + '-01');

  for (let i = 0; i < 12; i++) {
    const current = new Date(start);
    current.setMonth(start.getMonth() + i);
    const monthKey = current.toISOString().substring(0, 7);

    const budget = await getMonthlyBudget(db, familyId, monthKey);
    const consolidation = await getMonthlyConsolidation(db, familyId, monthKey, monthKey);

    const totalCards = Object.values(consolidation[monthKey] || {}).reduce(
      (sum, val) => sum + val,
      0
    );

    const finalBalance = budget.balanceBeforeCards - totalCards;

    planning.push({
      month: monthKey,
      ...budget,
      totalCards,
      finalBalance,
    });
  }

  return planning;
}

/**
 * Obtém as próximas parcelas que vencem em um período
 */
export async function getUpcomingInstallments(
  db: DrizzleD1Database,
  familyId: string,
  limit: number = 10
) {
  return db
    .select({
      installment: schema.installments,
      card: schema.creditCards,
    })
    .from(schema.installments)
    .leftJoin(
      schema.creditCards,
      eq(schema.installments.cardId, schema.creditCards.id)
    )
    .where(
      and(
        eq(schema.installments.familyId, familyId),
        eq(schema.installments.active, true),
        eq(schema.installments.paid, false)
      )
    )
    .orderBy(schema.installments.startMonth)
    .limit(limit)
    .all();
}

/**
 * Estatísticas gerais da família
 */
export async function getFamilyStats(db: DrizzleD1Database, familyId: string) {
  const [
    totalCards,
    activeInstallments,
    totalIncomes,
    totalFixedExpenses,
    totalVariableExpenses,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.creditCards)
      .where(
        and(
          eq(schema.creditCards.familyId, familyId),
          eq(schema.creditCards.active, true)
        )
      )
      .get(),

    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.installments)
      .where(
        and(
          eq(schema.installments.familyId, familyId),
          eq(schema.installments.active, true),
          eq(schema.installments.paid, false)
        )
      )
      .get(),

    db
      .select({ total: sql<number>`sum(monthly_value)` })
      .from(schema.incomes)
      .where(
        and(
          eq(schema.incomes.familyId, familyId),
          eq(schema.incomes.active, true)
        )
      )
      .get(),

    db
      .select({ total: sql<number>`sum(monthly_value)` })
      .from(schema.fixedExpenses)
      .where(
        and(
          eq(schema.fixedExpenses.familyId, familyId),
          eq(schema.fixedExpenses.active, true)
        )
      )
      .get(),

    db
      .select({ total: sql<number>`sum(average_value)` })
      .from(schema.variableExpenses)
      .where(
        and(
          eq(schema.variableExpenses.familyId, familyId),
          eq(schema.variableExpenses.active, true)
        )
      )
      .get(),
  ]);

  return {
    totalCards: totalCards?.count || 0,
    activeInstallments: activeInstallments?.count || 0,
    totalIncome: totalIncomes?.total || 0,
    totalExpenses: (totalFixedExpenses?.total || 0) + (totalVariableExpenses?.total || 0),
  };
}
