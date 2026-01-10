import { Context, Next } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '@financeiro/database';
import { verifyJWT } from '../lib/crypto';
import type { Env } from '../index';

/**
 * Tipo extendido do contexto com user
 */
export type AuthContext = Context<{ Bindings: Env }> & {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    familyId: string;
    plan: string;
  };
};

/**
 * Middleware: Require Auth (JWT válido)
 * Valida access token e anexa user ao contexto
 */
export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token não fornecido',
      },
    }, 401);
  }

  const token = authHeader.substring(7);

  try {
    const payload = await verifyJWT(token, c.env.JWT_SECRET);

    if (!payload || !payload.sub) {
      return c.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token inválido ou expirado',
        },
      }, 401);
    }

    // Buscar usuário no banco
    const db = drizzle(c.env.DB);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .get();

    if (!user) {
      return c.json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
        },
      }, 401);
    }

    // Anexar user ao contexto
    (c as AuthContext).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      familyId: user.familyId,
      plan: (user as any).plan || 'FREE',
    };

    await next();
  } catch (error) {
    return c.json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Erro na autenticação',
      },
    }, 401);
  }
}

/**
 * Middleware: Require Plan (gating por plano)
 * Uso: requirePlan(['PRO', 'FAMILY'])
 */
export function requirePlan(allowedPlans: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authCtx = c as AuthContext;

    if (!authCtx.user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticação necessária',
        },
      }, 401);
    }

    const userPlan = authCtx.user.plan || 'FREE';

    if (!allowedPlans.includes(userPlan)) {
      return c.json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: `Este recurso requer plano: ${allowedPlans.join(' ou ')}`,
          currentPlan: userPlan,
          requiredPlans: allowedPlans,
        },
      }, 403);
    }

    await next();
  };
}

/**
 * Middleware: Require Role (admin, member)
 */
export function requireRole(allowedRoles: string[]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const authCtx = c as AuthContext;

    if (!authCtx.user) {
      return c.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Autenticação necessária',
        },
      }, 401);
    }

    if (!allowedRoles.includes(authCtx.user.role)) {
      return c.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Permissão insuficiente',
        },
      }, 403);
    }

    await next();
  };
}

/**
 * Helper: Extrair user do contexto
 */
export function getAuthUser(c: Context): AuthContext['user'] {
  return (c as AuthContext).user;
}
