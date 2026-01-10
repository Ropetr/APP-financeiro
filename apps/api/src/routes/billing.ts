import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { users, subscriptions, auditLogs } from '@financeiro/database';
import { requireAuth, getAuthUser } from '../middleware/auth';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

/**
 * POST /billing/checkout
 * Cria sessão de checkout do Stripe
 */
app.post('/checkout', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);
  const body = await c.req.json();

  const { plan } = body; // PRO ou FAMILY

  if (!plan || !['PRO', 'FAMILY'].includes(plan)) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_PLAN',
        message: 'Plano inválido. Use PRO ou FAMILY',
      },
    }, 400);
  }

  if (!c.env.STRIPE_SECRET_KEY) {
    return c.json({
      success: false,
      error: {
        code: 'STRIPE_NOT_CONFIGURED',
        message: 'Stripe não configurado',
      },
    }, 500);
  }

  // Preços (configurar no Stripe e pegar os IDs)
  const priceIds: Record<string, string> = {
    PRO: 'price_pro_monthly', // Substituir pelo price_id real do Stripe
    FAMILY: 'price_family_monthly',
  };

  const priceId = priceIds[plan];

  // Buscar ou criar customer_id do Stripe
  let stripeCustomerId = (user as any).stripeCustomerId;

  if (!stripeCustomerId) {
    // Criar customer no Stripe
    const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: user!.email,
        name: user!.name,
        metadata: JSON.stringify({
          userId: user!.id,
          familyId: user!.familyId,
        }),
      }),
    });

    const customer = await customerResponse.json();

    if (customer.error) {
      return c.json({
        success: false,
        error: {
          code: 'STRIPE_ERROR',
          message: customer.error.message,
        },
      }, 500);
    }

    stripeCustomerId = customer.id;

    // Salvar no banco
    await db.update(users)
      .set({ stripeCustomerId } as any)
      .where(eq(users.id, user!.id))
      .run();
  }

  // Criar Checkout Session
  const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      customer: stripeCustomerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      mode: 'subscription',
      success_url: `${c.req.header('Origin') || 'http://localhost:3000'}/dashboard?checkout=success`,
      cancel_url: `${c.req.header('Origin') || 'http://localhost:3000'}/billing?checkout=canceled`,
      client_reference_id: user!.id,
      'metadata[userId]': user!.id,
      'metadata[familyId]': user!.familyId,
      'metadata[plan]': plan,
    }),
  });

  const checkoutSession = await session.json();

  if (checkoutSession.error) {
    return c.json({
      success: false,
      error: {
        code: 'STRIPE_ERROR',
        message: checkoutSession.error.message,
      },
    }, 500);
  }

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId: user!.id,
    action: 'billing.checkout_created',
    resource: 'billing',
    meta: JSON.stringify({ plan, sessionId: checkoutSession.id }),
    ip: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  } as any).run();

  return c.json({
    success: true,
    data: {
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    },
  });
});

/**
 * POST /billing/webhook
 * Webhook do Stripe (valida assinatura e processa eventos)
 */
app.post('/webhook', async (c) => {
  const db = drizzle(c.env.DB);

  if (!c.env.STRIPE_WEBHOOK_SECRET) {
    return c.json({ error: 'Webhook secret not configured' }, 500);
  }

  const signature = c.req.header('stripe-signature');
  if (!signature) {
    return c.json({ error: 'No signature' }, 400);
  }

  const payload = await c.req.text();

  // Verificar assinatura (Stripe usa HMAC SHA256)
  const isValid = await verifyStripeSignature(
    payload,
    signature,
    c.env.STRIPE_WEBHOOK_SECRET
  );

  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const event = JSON.parse(payload);

  // Processar eventos
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(db, event.data.object);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(db, event.data.object);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(db, event.data.object);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(db, event.data.object);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return c.json({ received: true });
});

/**
 * GET /billing/subscription
 * Retorna assinatura atual do usuário
 */
app.get('/subscription', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user!.id))
    .get();

  return c.json({
    success: true,
    data: subscription || null,
  });
});

/**
 * POST /billing/cancel
 * Cancela assinatura no final do período
 */
app.post('/cancel', requireAuth, async (c) => {
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);

  const subscription = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user!.id))
    .get() as any;

  if (!subscription || !subscription.stripeSubscriptionId) {
    return c.json({
      success: false,
      error: {
        code: 'NO_SUBSCRIPTION',
        message: 'Nenhuma assinatura ativa encontrada',
      },
    }, 404);
  }

  // Cancelar no Stripe
  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${subscription.stripeSubscriptionId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        cancel_at_period_end: 'true',
      }),
    }
  );

  const updatedSub = await response.json();

  if (updatedSub.error) {
    return c.json({
      success: false,
      error: {
        code: 'STRIPE_ERROR',
        message: updatedSub.error.message,
      },
    }, 500);
  }

  // Atualizar no banco
  await db.update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    } as any)
    .where(eq(subscriptions.id, subscription.id))
    .run();

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId: user!.id,
    action: 'billing.subscription_canceled',
    resource: 'billing',
    ip: c.req.header('CF-Connecting-IP'),
    createdAt: new Date(),
  } as any).run();

  return c.json({
    success: true,
    message: 'Assinatura será cancelada ao final do período',
  });
});

// ========== Helpers ==========

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const [timestampPart, signaturePart] = signature.split(',').map(p => p.split('=')[1]);
  const timestamp = timestampPart;
  const expectedSignature = signaturePart;

  const signedPayload = `${timestamp}.${payload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === expectedSignature;
}

async function handleCheckoutCompleted(db: any, session: any) {
  const userId = session.client_reference_id || session.metadata?.userId;
  const plan = session.metadata?.plan || 'PRO';

  if (!userId) return;

  // Atualizar plano do usuário
  await db.update(users)
    .set({ plan } as any)
    .where(eq(users.id, userId))
    .run();

  console.log(`Checkout completed for user ${userId}, plan: ${plan}`);
}

async function handleSubscriptionUpdated(db: any, subscription: any) {
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  const plan = subscription.metadata?.plan || 'PRO';
  const status = subscription.status; // active, trialing, past_due, canceled

  // Upsert subscription
  const existing = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .get();

  if (existing) {
    await db.update(subscriptions)
      .set({
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date(),
      } as any)
      .where(eq(subscriptions.id, existing.id))
      .run();
  } else {
    await db.insert(subscriptions).values({
      id: nanoid(),
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price?.id,
      plan,
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any).run();
  }

  // Atualizar plano do usuário
  await db.update(users)
    .set({ plan: status === 'active' ? plan : 'FREE' } as any)
    .where(eq(users.id, userId))
    .run();

  console.log(`Subscription updated for user ${userId}: ${status}`);
}

async function handleSubscriptionDeleted(db: any, subscription: any) {
  const userId = subscription.metadata?.userId;

  if (!userId) return;

  // Downgrade para FREE
  await db.update(users)
    .set({ plan: 'FREE' } as any)
    .where(eq(users.id, userId))
    .run();

  // Atualizar subscription
  await db.update(subscriptions)
    .set({
      status: 'canceled',
      canceledAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id))
    .run();

  console.log(`Subscription deleted for user ${userId}`);
}

async function handlePaymentFailed(db: any, invoice: any) {
  const userId = invoice.subscription_details?.metadata?.userId;

  if (!userId) return;

  // Atualizar status
  await db.update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    } as any)
    .where(eq(subscriptions.userId, userId))
    .run();

  // Audit log
  await db.insert(auditLogs).values({
    id: nanoid(),
    userId,
    action: 'billing.payment_failed',
    resource: 'billing',
    meta: JSON.stringify({ invoiceId: invoice.id }),
    createdAt: new Date(),
  } as any).run();

  console.log(`Payment failed for user ${userId}`);
}

export default app;
