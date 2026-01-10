import { Context, Next } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import type { Env } from '../index';

/**
 * Rate limiter simples usando D1
 * Ideal seria Durable Objects, mas para MVP isso funciona
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
}

const defaultConfig: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 minuto
  blockDurationMs: 15 * 60 * 1000, // 15 minutos
};

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };

  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const endpoint = c.req.path;
    const key = `ratelimit:${endpoint}:${ip}`;

    const db = drizzle(c.env.DB);
    const now = Date.now();

    try {
      // Buscar registro
      const record = await db.execute({
        sql: `SELECT * FROM rate_limits WHERE key = ?`,
        args: [key],
      });

      const existing = record.rows[0] as any;

      // Se está bloqueado
      if (existing && existing.blocked_until && existing.blocked_until > now) {
        const remainingMs = existing.blocked_until - now;
        const remainingSec = Math.ceil(remainingMs / 1000);

        return c.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Muitas tentativas. Tente novamente em ${remainingSec} segundos.`,
            retryAfter: remainingSec,
          },
        }, 429);
      }

      // Se não existe ou expirou a janela, criar/resetar
      if (!existing || (now - existing.last_attempt) > cfg.windowMs) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO rate_limits (key, attempts, last_attempt, blocked_until) VALUES (?, 1, ?, NULL)`,
          args: [key, now],
        });

        await next();
        return;
      }

      // Incrementar tentativas
      const newAttempts = existing.attempts + 1;

      if (newAttempts >= cfg.maxAttempts) {
        // Bloquear
        const blockedUntil = now + cfg.blockDurationMs;

        await db.execute({
          sql: `UPDATE rate_limits SET attempts = ?, last_attempt = ?, blocked_until = ? WHERE key = ?`,
          args: [newAttempts, now, blockedUntil, key],
        });

        return c.json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Muitas tentativas. Bloqueado por ${cfg.blockDurationMs / 1000 / 60} minutos.`,
            retryAfter: Math.ceil(cfg.blockDurationMs / 1000),
          },
        }, 429);
      }

      // Atualizar
      await db.execute({
        sql: `UPDATE rate_limits SET attempts = ?, last_attempt = ? WHERE key = ?`,
        args: [newAttempts, now, key],
      });

      await next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // Em caso de erro, permitir (fail-open)
      await next();
    }
  };
}

/**
 * Rate limit para auth endpoints
 */
export const authRateLimit = rateLimit({
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 min
  blockDurationMs: 15 * 60 * 1000, // 15 min
});

/**
 * Rate limit para reset de senha
 */
export const resetRateLimit = rateLimit({
  maxAttempts: 3,
  windowMs: 60 * 1000,
  blockDurationMs: 60 * 60 * 1000, // 1 hora
});
