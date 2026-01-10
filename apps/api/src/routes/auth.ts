import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, gt } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { users, families, sessions, passwordResets, auditLogs } from '@financeiro/database';
import {
  generateSalt,
  generateToken,
  hashPassword,
  verifyPassword,
  hashToken,
  generateJWT,
  verifyJWT,
  validatePasswordStrength,
} from '../lib/crypto';
import { authRateLimit, resetRateLimit } from '../middleware/rate-limit';
import { requireAuth, getAuthUser } from '../middleware/auth';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /auth/register
 * Cria nova conta
 */
app.post('/register', authRateLimit, async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const { email, password, name } = body;

  // Validações
  if (!email || !password || !name) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email, password e name são obrigatórios',
      },
    }, 400);
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_EMAIL',
        message: 'Email inválido',
      },
    }, 400);
  }

  // Validar força da senha
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    return c.json({
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: 'Senha fraca',
        details: passwordValidation.errors,
      },
    }, 400);
  }

  // Verificar se email já existe
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  if (existingUser) {
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_EXISTS',
        message: 'Email já cadastrado',
      },
    }, 409);
  }

  // Hash da senha
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt, 150000);

  // Criar família (cada novo usuário cria sua própria família no MVP)
  const familyId = nanoid();
  await db.insert(families).values({
    id: familyId,
    name: `Família ${name}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).run();

  // Criar usuário
  const userId = nanoid();
  await db.insert(users).values({
    id: userId,
    email: email.toLowerCase(),
    name,
    role: 'admin',
    familyId,
    passwordHash,
    passwordSalt: salt,
    passwordAlgo: 'PBKDF2-SHA256',
    passwordIters: 150000,
    emailVerified: false,
    plan: 'FREE',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any).run();

  // Gerar tokens
  const accessToken = await generateJWT(
    { sub: userId, email, role: 'admin', familyId, plan: 'FREE' },
    c.env.JWT_SECRET,
    900 // 15 min
  );

  const refreshToken = generateToken(32);
  const refreshTokenHash = await hashToken(refreshToken);

  // Salvar sessão
  const sessionId = nanoid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshTokenHash,
    createdAt: new Date(),
    expiresAt,
    lastUsedAt: new Date(),
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For'),
  } as any).run();

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId,
    action: 'user.register',
    resource: 'auth',
    ip: c.req.header('CF-Connecting-IP'),
    userAgent: c.req.header('User-Agent'),
    createdAt: new Date(),
  } as any).run();

  return c.json({
    success: true,
    data: {
      user: {
        id: userId,
        email,
        name,
        role: 'admin',
        familyId,
        plan: 'FREE',
      },
      accessToken,
      refreshToken,
    },
  }, 201);
});

/**
 * POST /auth/login
 * Login
 */
app.post('/login', authRateLimit, async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const { email, password } = body;

  if (!email || !password) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email e password são obrigatórios',
      },
    }, 400);
  }

  // Buscar usuário
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get() as any;

  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos',
      },
    }, 401);
  }

  // Verificar senha
  const valid = await verifyPassword(
    password,
    user.passwordHash,
    user.passwordSalt,
    user.passwordIters
  );

  if (!valid) {
    // Audit log de tentativa falha
    await db.insert(auditLogs).values({
      id: nanoid(),
      userId: user.id,
      action: 'user.login_failed',
      resource: 'auth',
      ip: c.req.header('CF-Connecting-IP'),
      createdAt: new Date(),
    } as any).run();

    return c.json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos',
      },
    }, 401);
  }

  // Gerar tokens
  const accessToken = await generateJWT(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
      plan: user.plan || 'FREE',
    },
    c.env.JWT_SECRET,
    900 // 15 min
  );

  const refreshToken = generateToken(32);
  const refreshTokenHash = await hashToken(refreshToken);

  // Criar sessão
  const sessionId = nanoid();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias

  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    refreshTokenHash,
    createdAt: new Date(),
    expiresAt,
    lastUsedAt: new Date(),
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('CF-Connecting-IP'),
  } as any).run();

  // Atualizar last login
  await db.update(users)
    .set({ lastLoginAt: new Date() } as any)
    .where(eq(users.id, user.id))
    .run();

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId: user.id,
    action: 'user.login',
    resource: 'auth',
    ip: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  } as any).run();

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        familyId: user.familyId,
        plan: user.plan || 'FREE',
      },
      accessToken,
      refreshToken,
    },
  });
});

/**
 * POST /auth/refresh
 * Renova access token usando refresh token (com rotação)
 */
app.post('/refresh', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'refreshToken é obrigatório',
      },
    }, 400);
  }

  // Hash do refresh token
  const tokenHash = await hashToken(refreshToken);

  // Buscar sessão
  const session = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.refreshTokenHash, tokenHash),
        eq(sessions.revokedAt, null) as any
      )
    )
    .get() as any;

  if (!session) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token inválido ou revogado',
      },
    }, 401);
  }

  // Verificar expiração
  const now = new Date();
  if (new Date(session.expiresAt) < now) {
    return c.json({
      success: false,
      error: {
        code: 'EXPIRED_REFRESH_TOKEN',
        message: 'Refresh token expirado',
      },
    }, 401);
  }

  // Buscar usuário
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .get() as any;

  if (!user) {
    return c.json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'Usuário não encontrado',
      },
    }, 401);
  }

  // Revogar sessão antiga
  await db.update(sessions)
    .set({ revokedAt: now } as any)
    .where(eq(sessions.id, session.id))
    .run();

  // Gerar novos tokens (ROTAÇÃO)
  const newAccessToken = await generateJWT(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      familyId: user.familyId,
      plan: user.plan || 'FREE',
    },
    c.env.JWT_SECRET,
    900
  );

  const newRefreshToken = generateToken(32);
  const newRefreshTokenHash = await hashToken(newRefreshToken);

  // Criar nova sessão
  const newSessionId = nanoid();
  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    id: newSessionId,
    userId: user.id,
    refreshTokenHash: newRefreshTokenHash,
    createdAt: now,
    expiresAt: newExpiresAt,
    lastUsedAt: now,
    userAgent: c.req.header('User-Agent'),
    ip: c.req.header('CF-Connecting-IP'),
  } as any).run();

  return c.json({
    success: true,
    data: {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * POST /auth/logout
 * Revoga refresh token
 */
app.post('/logout', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const { refreshToken } = body;

  if (!refreshToken) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'refreshToken é obrigatório',
      },
    }, 400);
  }

  const tokenHash = await hashToken(refreshToken);

  // Revogar sessão
  await db.update(sessions)
    .set({ revokedAt: new Date() } as any)
    .where(eq(sessions.refreshTokenHash, tokenHash))
    .run();

  return c.json({
    success: true,
    message: 'Logout realizado com sucesso',
  });
});

/**
 * POST /auth/forgot
 * Solicita reset de senha (gera token)
 */
app.post('/forgot', resetRateLimit, async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const { email } = body;

  if (!email) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email é obrigatório',
      },
    }, 400);
  }

  // Buscar usuário
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .get();

  // Sempre retornar sucesso (não vazar se o email existe)
  if (!user) {
    return c.json({
      success: true,
      message: 'Se o email existir, você receberá instruções para redefinir a senha',
    });
  }

  // Gerar token de reset
  const resetToken = generateToken(24);
  const resetTokenHash = await hashToken(resetToken);

  const resetId = nanoid();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

  await db.insert(passwordResets).values({
    id: resetId,
    userId: user.id,
    tokenHash: resetTokenHash,
    createdAt: new Date(),
    expiresAt,
  } as any).run();

  // TODO: Enviar email com o resetToken
  // Por enquanto, log (em produção, integrar com serviço de email)
  console.log(`Reset token para ${email}: ${resetToken}`);

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId: user.id,
    action: 'user.password_reset_requested',
    resource: 'auth',
    ip: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  } as any).run();

  return c.json({
    success: true,
    message: 'Se o email existir, você receberá instruções para redefinir a senha',
    // Apenas para desenvolvimento/teste:
    ...(c.env.ENVIRONMENT === 'development' && { resetToken }),
  });
});

/**
 * POST /auth/reset
 * Redefine senha usando token
 */
app.post('/reset', async (c) => {
  const db = drizzle(c.env.DB);
  const body = await c.req.json();

  const { token, newPassword } = body;

  if (!token || !newPassword) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'token e newPassword são obrigatórios',
      },
    }, 400);
  }

  // Validar força da nova senha
  const passwordValidation = validatePasswordStrength(newPassword);
  if (!passwordValidation.valid) {
    return c.json({
      success: false,
      error: {
        code: 'WEAK_PASSWORD',
        message: 'Senha fraca',
        details: passwordValidation.errors,
      },
    }, 400);
  }

  // Buscar token
  const tokenHash = await hashToken(token);
  const resetRecord = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        eq(passwordResets.usedAt, null) as any
      )
    )
    .get() as any;

  if (!resetRecord) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token inválido ou já utilizado',
      },
    }, 400);
  }

  // Verificar expiração
  if (new Date(resetRecord.expiresAt) < new Date()) {
    return c.json({
      success: false,
      error: {
        code: 'EXPIRED_TOKEN',
        message: 'Token expirado',
      },
    }, 400);
  }

  // Atualizar senha
  const newSalt = generateSalt();
  const newPasswordHash = await hashPassword(newPassword, newSalt, 150000);

  await db.update(users)
    .set({
      passwordHash: newPasswordHash,
      passwordSalt: newSalt,
      updatedAt: new Date(),
    } as any)
    .where(eq(users.id, resetRecord.userId))
    .run();

  // Marcar token como usado
  await db.update(passwordResets)
    .set({ usedAt: new Date() } as any)
    .where(eq(passwordResets.id, resetRecord.id))
    .run();

  // Revogar todas as sessões do usuário
  await db.update(sessions)
    .set({ revokedAt: new Date() } as any)
    .where(eq(sessions.userId, resetRecord.userId))
    .run();

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId: resetRecord.userId,
    action: 'user.password_reset',
    resource: 'auth',
    ip: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  } as any).run();

  return c.json({
    success: true,
    message: 'Senha redefinida com sucesso',
  });
});

/**
 * GET /me
 * Retorna dados do usuário autenticado
 */
app.get('/me', requireAuth, async (c) => {
  const user = getAuthUser(c);

  return c.json({
    success: true,
    data: user,
  });
});

export default app;
