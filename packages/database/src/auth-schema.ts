import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { users } from './schema';

/**
 * Sessões de refresh tokens
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  userAgent: text('user_agent'),
  ip: text('ip'),
  deviceInfo: text('device_info'),
}, (table) => ({
  userIdx: index('idx_sessions_user_id').on(table.userId),
  hashIdx: index('idx_sessions_refresh_hash').on(table.refreshTokenHash),
  expiresIdx: index('idx_sessions_expires_at').on(table.expiresAt),
}));

/**
 * Tokens de reset de senha
 */
export const passwordResets = sqliteTable('password_resets', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
}, (table) => ({
  userIdx: index('idx_pwreset_user_id').on(table.userId),
  tokenIdx: index('idx_pwreset_token_hash').on(table.tokenHash),
}));

/**
 * Audit logs
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(),
  resource: text('resource'),
  meta: text('meta', { mode: 'json' }),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('idx_audit_user_id').on(table.userId),
  actionIdx: index('idx_audit_action').on(table.action),
  createdIdx: index('idx_audit_created_at').on(table.createdAt),
}));

/**
 * Assinaturas Stripe
 */
export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripePriceId: text('stripe_price_id'),
  plan: text('plan', { enum: ['FREE', 'PRO', 'FAMILY'] }).notNull(),
  status: text('status', { enum: ['active', 'canceled', 'past_due', 'trialing'] }).notNull(),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
  canceledAt: integer('canceled_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('idx_subscriptions_user_id').on(table.userId),
  stripeIdx: index('idx_subscriptions_stripe_id').on(table.stripeSubscriptionId),
}));

/**
 * Rate limiting
 */
export const rateLimits = sqliteTable('rate_limits', {
  key: text('key').primaryKey(),
  attempts: integer('attempts').notNull().default(0),
  lastAttempt: integer('last_attempt', { mode: 'timestamp' }).notNull(),
  blockedUntil: integer('blocked_until', { mode: 'timestamp' }),
}, (table) => ({
  blockedIdx: index('idx_rate_limits_blocked').on(table.blockedUntil),
}));

// Types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
